// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TypelessiOS",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "TypelessCore",
            targets: ["TypelessCore"]
        ),
        .executable(
            name: "typeless-ios-selftest",
            targets: ["TypelessCoreTests"]
        )
    ],
    targets: [
        .target(
            name: "TypelessCore",
            path: "Sources/TypelessCore"
        ),
        .executableTarget(
            name: "TypelessCoreTests",
            dependencies: ["TypelessCore"],
            path: "Tests/TypelessCoreTests"
        )
    ]
)
