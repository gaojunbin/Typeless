export function shortcutLabel(binding: string, mac: boolean) {
  const labels: Record<string, string> = {
    commandorcontrol: mac ? '⌘' : 'Ctrl', cmdorctrl: mac ? '⌘' : 'Ctrl', command: '⌘', cmd: '⌘',
    control: mac ? '⌃' : 'Ctrl', ctrl: mac ? '⌃' : 'Ctrl', shift: '⇧', alt: mac ? '⌥' : 'Alt', option: mac ? '⌥' : 'Alt',
    super: mac ? '⌘' : 'Win', meta: mac ? '⌘' : 'Win', space: 'Space', rightalt: 'Right Alt', fn: 'Fn',
    up: '↑', down: '↓', left: '←', right: '→', escape: 'Esc', return: 'Enter',
  };
  return binding.split('+').map(key => labels[key.toLowerCase()] || (key.length === 1 ? key.toUpperCase() : key)).join(' ');
}
