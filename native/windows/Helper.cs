using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

public static class TypelessNative {
    private static readonly object OutputGate = new object();
    private static readonly object RequestGate = new object();
    private static readonly Dictionary<string, string> States = new Dictionary<string, string>();
    private static readonly BlockingCollection<string> Requests = new BlockingCollection<string>();
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    private static HookProc HookCallback = Keyboard;
    private static IntPtr Hook = IntPtr.Zero;
    private static string Binding = "right-alt";
    private static bool AltDown, Candidate;
    private static long Started;
    private static string HeldEndpoint;
    private static volatile bool Closing;
    private delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    [StructLayout(LayoutKind.Sequential)] private struct KeyboardData { public uint vk, scan, flags, time; public UIntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] private struct KeyInput { public ushort vk, scan; public uint flags, time; public UIntPtr extra; }
    [StructLayout(LayoutKind.Explicit)] private struct InputUnion { [FieldOffset(0)] public KeyInput keyboard; [FieldOffset(0)] public MouseInput mouse; }
    [StructLayout(LayoutKind.Sequential)] private struct MouseInput { public int x, y; public uint data, flags, time; public UIntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] private struct Input { public uint type; public InputUnion data; }
    [DllImport("user32.dll")] private static extern IntPtr SetWindowsHookEx(int id, HookProc callback, IntPtr module, uint thread);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll", CharSet = CharSet.Auto)] private static extern IntPtr GetModuleHandle(string name);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll", SetLastError=true)] private static extern uint SendInput(uint count, Input[] inputs, int size);
    // Core Audio interop: each interface declares every vtable slot, in mmdeviceapi.h / endpointvolume.h order, up to the last method called.
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] private class MMDeviceEnumerator { }
    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] private interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int flow, uint states, out IntPtr devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    }
    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] private interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, uint context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object result);
        [PreserveSig] int OpenPropertyStore(uint access, out IntPtr store);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    }
    [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] private interface IAudioEndpointVolume {
        [PreserveSig] int RegisterControlChangeNotify(IntPtr callback);
        [PreserveSig] int UnregisterControlChangeNotify(IntPtr callback);
        [PreserveSig] int GetChannelCount(out uint count);
        [PreserveSig] int SetMasterVolumeLevel(float decibels, ref Guid context);
        [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid context);
        [PreserveSig] int GetMasterVolumeLevel(out float decibels);
        [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
        [PreserveSig] int SetChannelVolumeLevel(uint channel, float decibels, ref Guid context);
        [PreserveSig] int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid context);
        [PreserveSig] int GetChannelVolumeLevel(uint channel, out float decibels);
        [PreserveSig] int GetChannelVolumeLevelScalar(uint channel, out float level);
        [PreserveSig] int SetMute(int mute, ref Guid context);
        [PreserveSig] int GetMute(out int mute);
    }

    private static Dictionary<string,object> Obj(params object[] values) { var result = new Dictionary<string,object>(); for(int i=0;i<values.Length;i+=2) result[(string)values[i]]=values[i+1]; return result; }
    private static void Emit(Dictionary<string,object> value) { lock(OutputGate) { Console.Out.WriteLine(Json.Serialize(value)); Console.Out.Flush(); } }
    private static string AppName() { try { uint pid; GetWindowThreadProcessId(GetForegroundWindow(),out pid); return Process.GetProcessById((int)pid).ProcessName; } catch { return ""; } }
    private static void Cancel(string id) { lock(RequestGate) { if(!States.ContainsKey(id))States[id]="cancelled"; } }
    private static void Check(string id,double deadline,bool consume) {
        lock(RequestGate) {
            Guid parsed;
            double now=(DateTime.UtcNow-new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc)).TotalMilliseconds;
            if(!Guid.TryParse(id,out parsed)||Double.IsNaN(deadline)||Double.IsInfinity(deadline)||deadline>now+10000)throw new Exception("invalid_request");
            if(now>deadline)throw new Exception("request_expired");
            string state; if(States.TryGetValue(id,out state))throw new Exception(state);
            if(consume)States[id]="already_dispatched";
        }
    }
    private static void CheckClipboard(string owner,string text) {
        try {
            var data=Clipboard.GetDataObject();
            if(data==null || !data.GetDataPresent("dev.typeless.owner",false))throw new Exception();
            object raw=data.GetData("dev.typeless.owner",false);
            string actual=raw as string;
            var bytes=raw as byte[]; if(bytes!=null)actual=Encoding.UTF8.GetString(bytes);
            var stream=raw as MemoryStream; if(stream!=null)actual=Encoding.UTF8.GetString(stream.ToArray());
            if(actual==null || actual.TrimEnd('\0')!=owner || Clipboard.GetText(TextDataFormat.UnicodeText)!=text)throw new Exception();
        } catch {throw new Exception("clipboard_changed");}
    }
    private static IntPtr Keyboard(int code, IntPtr message, IntPtr data) {
        if(code>=0 && Binding=="right-alt") {
            var key=(KeyboardData)Marshal.PtrToStructure(data,typeof(KeyboardData));
            int msg=message.ToInt32(); bool down=msg==0x100 || msg==0x104; bool up=msg==0x101 || msg==0x105;
            if((key.flags&0x10)==0) {
                if(key.vk==0xA5) {
                    if(down && !AltDown) { AltDown=true; Candidate=GetAsyncKeyState(0x11)>=0 && GetAsyncKeyState(0x10)>=0 && GetAsyncKeyState(0x5B)>=0 && GetAsyncKeyState(0x5C)>=0; Started=Stopwatch.GetTimestamp(); }
                    if(up) { if(AltDown && Candidate && (Stopwatch.GetTimestamp()-Started)/(double)Stopwatch.Frequency<2) Emit(Obj("event","shortcut","params",Obj("action","toggle"))); AltDown=false; Candidate=false; }
                } else if(down) Candidate=false;
            }
        }
        return CallNextHookEx(Hook,code,message,data);
    }
    private static Dictionary<string,object> Status() { return Obj("platform","win32","accessibility",true,"inputMonitoring",Hook!=IntPtr.Zero,"shortcutAvailable",Hook!=IntPtr.Zero,"binding",Binding); }
    private static Dictionary<string,object> Paste(Dictionary<string,object> args) {
        object rawId,rawDeadline,rawText,rawOwner;
        if(!args.TryGetValue("requestId",out rawId)||!args.TryGetValue("deadlineMs",out rawDeadline)||!args.TryGetValue("text",out rawText)||!args.TryGetValue("clipboardOwner",out rawOwner))throw new Exception("invalid_request");
        string id=rawId as string,text=rawText as string,owner=rawOwner as string;
        if(String.IsNullOrEmpty(text)||String.IsNullOrEmpty(owner))throw new Exception("invalid_request");
        double deadline=Convert.ToDouble(rawDeadline); Check(id,deadline,false);
        // Modern Windows terminals conventionally accept Ctrl+Shift+V. Other
        // applications receive Ctrl+V; the foreground application handles it.
        string app=AppName().ToLowerInvariant();
        bool shift=app=="windowsterminal"||app=="wezterm-gui"||app=="alacritty";
        var keys=new List<Input>();
        Action<ushort,bool> add=(key,up)=>{var input=new Input();input.type=1;input.data.keyboard.vk=key;input.data.keyboard.flags=up?2u:0u;keys.Add(input);};
        add(0x11,false);if(shift)add(0x10,false);add(0x56,false);add(0x56,true);if(shift)add(0x10,true);add(0x11,true);
        CheckClipboard(owner,text); Check(id,deadline,true);
        if(SendInput((uint)keys.Count,keys.ToArray(),Marshal.SizeOf(typeof(Input)))!=keys.Count)throw new Exception("insertion_uncertain");
        return Obj("status","dispatched");
    }
    private static void Free(object value) { if(value!=null && Marshal.IsComObject(value)) Marshal.ReleaseComObject(value); }
    private static IMMDeviceEnumerator Devices() { try { return (IMMDeviceEnumerator)new MMDeviceEnumerator(); } catch { return null; } }
    private static IAudioEndpointVolume Volume(IMMDevice device) {
        Guid iid=typeof(IAudioEndpointVolume).GUID; object raw;
        if(device.Activate(ref iid,0x17,IntPtr.Zero,out raw)<0) { Free(raw); return null; }
        var volume=raw as IAudioEndpointVolume; if(volume==null)Free(raw); return volume;
    }
    private static Dictionary<string,object> NotMuted(string reason) { return Obj("muted",false,"reason",reason); }
    // The endpoint ID is held, not the default role, so restore reaches the muted device even if the default output changes meanwhile.
    private static Dictionary<string,object> MuteOutput() {
        if(HeldEndpoint!=null)return Obj("muted",true);
        IMMDeviceEnumerator devices=Devices(); IMMDevice device=null; IAudioEndpointVolume volume=null;
        try {
            if(devices==null)return NotMuted("unsupported");
            if(devices.GetDefaultAudioEndpoint(0,1,out device)<0||device==null)return NotMuted("no_device");
            int muted; string id; Guid context=Guid.Empty; volume=Volume(device);
            if(volume==null||volume.GetMute(out muted)<0)return NotMuted("unsupported");
            if(muted!=0)return NotMuted("already_muted");
            if(device.GetId(out id)<0||String.IsNullOrEmpty(id)||volume.SetMute(1,ref context)<0)return NotMuted("failed");
            HeldEndpoint=id; return Obj("muted",true);
        } catch { return NotMuted("failed"); }
        finally { Free(volume); Free(device); Free(devices); }
    }
    private static bool RestoreOutput() {
        string id=HeldEndpoint; HeldEndpoint=null;
        if(id==null)return false;
        IMMDeviceEnumerator devices=Devices(); IMMDevice device=null; IAudioEndpointVolume volume=null;
        try {
            if(devices==null||devices.GetDevice(id,out device)<0||device==null)return false;
            int muted; Guid context=Guid.Empty; volume=Volume(device);
            return volume!=null&&volume.GetMute(out muted)>=0&&muted!=0&&volume.SetMute(0,ref context)>=0;
        } catch { return false; }
        finally { Free(volume); Free(device); Free(devices); }
    }
    private static Dictionary<string,object> Handle(string method, Dictionary<string,object> args) {
        if(method=="status" || method=="requestPermissions")return Status();
        if(method=="configureShortcut") { string binding=Convert.ToString(args["binding"]); if(binding!="right-alt" && binding!="disabled") throw new Exception("unsupported_shortcut"); Binding=binding; Candidate=false; return Obj("binding",binding,"available",binding=="disabled" || Hook!=IntPtr.Zero); }
        if(method=="context")return Obj("appName",AppName());
        if(method=="cancelPaste")return Obj("cancelled",true);
        if(method=="pasteText")return Paste(args);
        if(method=="muteOutput")return MuteOutput();
        if(method=="restoreOutput")return Obj("restored",RestoreOutput());
        if(method=="stop") {RestoreOutput();Environment.Exit(0);return Obj("stopped",true);}
        throw new Exception("unknown_method");
    }
    [STAThread] public static void Run() {
        Hook=SetWindowsHookEx(13,HookCallback,GetModuleHandle(null),0);
        Emit(Obj("event","ready","params",Obj("platform","win32")));
        var worker=new Thread(()=> {
            var parser=new JavaScriptSerializer();
            foreach(string line in Requests.GetConsumingEnumerable()) {
                if(Closing)continue;
                object id=null;
                try {var request=parser.Deserialize<Dictionary<string,object>>(line); if(request.ContainsKey("id"))id=request["id"]; var args=request.ContainsKey("params")?request["params"] as Dictionary<string,object>:new Dictionary<string,object>(); Emit(Obj("id",id,"result",Handle(Convert.ToString(request["method"]),args??new Dictionary<string,object>())));}
                catch(Exception error) {string code=error.Message; if(code.Length>80||code.IndexOf(' ')>=0)code="native_error"; Emit(Obj("id",id,"error",Obj("code",code,"message","Paste could not be confirmed. The result remains on the clipboard; check the foreground application before retrying.")));}
            }
            RestoreOutput();
        }); worker.SetApartmentState(ApartmentState.STA);worker.IsBackground=true;worker.Start();
        var reader=new Thread(()=> {
            var parser=new JavaScriptSerializer(); string line;
            while((line=Console.ReadLine())!=null) {
                if(line.Length>1000000)continue;
                try {var request=parser.Deserialize<Dictionary<string,object>>(line);object method,raw;
                    if(request.TryGetValue("method",out method)&&Convert.ToString(method)=="cancelPaste"&&request.TryGetValue("params",out raw)) {
                        var args=raw as Dictionary<string,object>;object id;
                        if(args!=null&&args.TryGetValue("requestId",out id)&&id is string)Cancel((string)id);
                    }
                } catch { }
                Requests.Add(line);
            }
            // Without a client, queued requests (a paste included) are dropped; the worker restores a held mute on its STA thread, and the exit follows even if it stalls.
            Closing=true;Requests.CompleteAdding();worker.Join(2000);Environment.Exit(0);
        });reader.IsBackground=true;reader.Start();
        Application.Run();if(Hook!=IntPtr.Zero)UnhookWindowsHookEx(Hook);
    }
}
