import SwiftUI

struct WorkbenchRoot: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var updates = IOSUpdateMonitor()
    @StateObject private var account = CloudAccountSession()

    var body: some View {
        Group {
            if account.signedIn {
                signedInContent
            } else {
                CloudSignInView()
            }
        }
        .environmentObject(account)
    }

    private var signedInContent: some View {
        TabView {
            NavigationStack {
                WorkbenchHome()
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }

            NavigationStack {
                QuickBenderView()
            }
            .tabItem {
                Label("Bender", systemImage: "ruler")
            }

            NavigationStack {
                WorkbenchTools()
            }
            .tabItem {
                Label("Tools", systemImage: "square.grid.2x2.fill")
            }

            NavigationStack {
                NativeSafetyWorkspaceView()
            }
            .tabItem {
                Label("Safety", systemImage: "shield.lefthalf.filled")
            }

            NavigationStack {
                AccountCentreView(updates: updates)
            }
            .tabItem {
                Label("Account", systemImage: "person.crop.circle")
            }
        }
        .toolbarBackground(WorkbenchStyle.background, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .safeAreaInset(edge: .top) {
            if let url = updates.availableURL {
                Link(destination: url) {
                    Label("New iOS version available · Open App Store", systemImage: "arrow.down.circle.fill")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(9)
                        .background(WorkbenchStyle.surface)
                }
            }
        }
        .task {
            while !Task.isCancelled {
                await updates.checkIfDue()
                await account.refresh()
                await AccountRecordSync.shared.syncIfDue(account: account)
                try? await Task.sleep(nanoseconds: 1_800_000_000_000)
            }
        }
        .onChange(of: scenePhase) { _, next in
            if next == .active {
                Task {
                    await updates.checkIfDue()
                    await account.refresh()
                    await AccountRecordSync.shared.syncIfDue(account: account)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .ewbLocalRecordChanged)) { _ in
            Task { await AccountRecordSync.shared.syncIfDue(account: account, force: true) }
        }
    }
}

struct WorkbenchHome: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 8) {
                    Label("ELECTRICAL WORKBENCH", systemImage: "bolt.fill")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(WorkbenchStyle.cyan)
                    Text("What are you working on?")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("Choose one task. Enter measurements, check the result, then save or export. Specialist tools are in Find a Tool.")
                        .font(.subheadline)
                        .foregroundStyle(WorkbenchStyle.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(WorkbenchStyle.surface, in: RoundedRectangle(cornerRadius: 16))

                NavigationLink {
                    WorkbenchTools()
                } label: {
                    HomeDestination(
                        icon: "magnifyingglass",
                        title: "Find a Tool",
                        detail: "One searchable directory for electrical, jobsite and study tasks",
                        emphasis: true
                    )
                }
                .buttonStyle(.plain)

                Text("COMMON JOBS")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(WorkbenchStyle.muted)

                NavigationLink {
                    QuickBenderView()
                } label: {
                    HomeDestination(icon: "ruler", title: "Bend conduit", detail: "Offline tape marks, offsets and stub-ups")
                }
                .buttonStyle(.plain)

                NavigationLink {
                    FeatureGate(feature: "ELECTRICAL_CALCULATORS", title: "Circuit sizing") {
                        UnifiedCircuitSizingView()
                    }
                } label: {
                    HomeDestination(icon: "bolt.circle", title: "Size an electrical circuit", detail: "Ampacity, voltage drop, assumptions and review")
                }
                .buttonStyle(.plain)

                NavigationLink {
                    TroubleshootingOfflineView()
                } label: {
                    HomeDestination(icon: "wrench.and.screwdriver", title: "Troubleshoot equipment", detail: "Offline motor, VFD, PLC and protection guides")
                }
                .buttonStyle(.plain)

                NavigationLink {
                    PullBoxSizingView()
                } label: {
                    HomeDestination(icon: "square.dashed", title: "Size a pull box", detail: "Straight, angle, U and back-wall pulls")
                }
                .buttonStyle(.plain)

                NavigationLink {
                    NativeWorkspacesView()
                } label: {
                    HomeDestination(icon: "folder", title: "Projects & saved work", detail: "Continue a jobsite record or export your work")
                }
                .buttonStyle(.plain)

                Text("1 · Find task   →   2 · Enter values   →   3 · Verify   →   4 · Save")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(WorkbenchStyle.muted)
                    .padding(.top, 3)
                Text("Code data and manufacturer requirements must be checked. Offline and cloud tools have different sync requirements.")
                    .font(.footnote)
                    .foregroundStyle(WorkbenchStyle.muted)
            }
            .padding(16)
            .frame(maxWidth: 740)
            .frame(maxWidth: .infinity)
        }
        .background(WorkbenchStyle.background)
        .navigationTitle("Home")
    }
}

private struct HomeDestination: View {
    let icon: String
    let title: String
    let detail: String
    var emphasis = false

    var body: some View {
        HStack(alignment: .center, spacing: 13) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(WorkbenchStyle.cyan)
                .frame(width: 36)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 5) {
                Text(title).font(.headline).foregroundStyle(.white)
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(WorkbenchStyle.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.bold))
                .foregroundStyle(WorkbenchStyle.cyan)
                .accessibilityHidden(true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(emphasis ? WorkbenchStyle.surface : WorkbenchStyle.surface.opacity(0.8),
                    in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(WorkbenchStyle.border, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}
