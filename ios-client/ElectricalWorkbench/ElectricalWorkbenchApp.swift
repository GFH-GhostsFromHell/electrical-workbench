import SwiftUI

@main
struct ElectricalWorkbenchApp: App {
    @AppStorage("ewb.ios.theme.v1") private var appearance = "midnight"

    var body: some Scene {
        WindowGroup {
            WorkbenchRoot()
                .tint(WorkbenchStyle.cyan)
                .preferredColorScheme(appearance == "daylight" || appearance == "workshop" ? .light : .dark)
        }
    }
}

/** Persistent local appearance. No change to the underlying engineering data. */
enum WorkbenchStyle {
    static var selection: String {
        let value = UserDefaults.standard.string(forKey: "ewb.ios.theme.v1") ?? "midnight"
        return ["daylight","midnight","workshop","contrast"].contains(value) ? value : "midnight"
    }
    static var background: Color {
        switch selection {
        case "daylight": return Color(red: 0.953, green: 0.967, blue: 0.988)
        case "workshop": return Color(red: 0.973, green: 0.941, blue: 0.902)
        case "contrast": return .black
        default: return Color(red: 0.035, green: 0.075, blue: 0.125)
        }
    }
    static var surface: Color {
        switch selection {
        case "daylight": return .white
        case "workshop": return Color(red: 1.0, green: 0.980, blue: 0.949)
        case "contrast": return Color(red: 0.035, green: 0.035, blue: 0.035)
        default: return Color(red: 0.065, green: 0.155, blue: 0.24)
        }
    }
    static var border: Color {
        switch selection {
        case "daylight": return Color(red: 0.66, green: 0.75, blue: 0.83)
        case "workshop": return Color(red: 0.74, green: 0.66, blue: 0.56)
        case "contrast": return .white
        default: return Color(red: 0.20, green: 0.37, blue: 0.47)
        }
    }
    static var cyan: Color {
        switch selection {
        case "daylight": return Color(red: 0.075, green: 0.34, blue: 0.49)
        case "workshop": return Color(red: 0.47, green: 0.25, blue: 0.11)
        case "contrast": return Color(red: 1.0, green: 0.88, blue: 0.36)
        default: return Color(red: 0.32, green: 0.87, blue: 0.93)
        }
    }
    static var muted: Color {
        switch selection {
        case "daylight": return Color(red: 0.27, green: 0.36, blue: 0.43)
        case "workshop": return Color(red: 0.38, green: 0.30, blue: 0.23)
        case "contrast": return .white
        default: return Color(red: 0.73, green: 0.84, blue: 0.90)
        }
    }
    static var text: Color {
        switch selection {
        case "daylight": return Color(red: 0.08, green: 0.16, blue: 0.24)
        case "workshop": return Color(red: 0.23, green: 0.17, blue: 0.13)
        default: return .white
        }
    }
}
