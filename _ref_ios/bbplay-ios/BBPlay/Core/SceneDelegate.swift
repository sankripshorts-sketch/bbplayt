import UIKit
import NeedleFoundation
import AppTrackingTransparency
import AppMetricaPush
import YooKassaPayments

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    private let rootComponent = RootComponent()
    
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        let newWindow = UIWindow(windowScene: windowScene)
        newWindow.rootViewController = rootComponent.tabBarViewControllerWithNavigation
        self.window = newWindow

        newWindow.makeKeyAndVisible()
        
        connectMetricaPush(with: connectionOptions)
        startCheckingForUpdatesApp(with: windowScene)
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Called as the scene is being released by the system.
        // This occurs shortly after the scene enters the background, or when its session is discarded.
        // Release any resources associated with this scene that can be re-created the next time the scene connects.
        // The scene may re-connect later, as its session was not necessarily discarded (see `application:didDiscardSceneSessions` instead).
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when the scene has moved from an inactive state to an active state.
        // Use this method to restart any tasks that were paused (or not yet started) when the scene was inactive.

        requestTrackingPermission()
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Called when the scene will move from an active state to an inactive state.
        // This may occur due to temporary interruptions (ex. an incoming phone call).
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as the scene transitions from the background to the foreground.
        // Use this method to undo the changes made on entering the background.
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as the scene transitions from the foreground to the background.
        // Use this method to save data, release shared resources, and store enough scene-specific state information
        // to restore the scene back to its current state.
    }
    
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        handleDeeplinkFromYooKassa(with: url)
    }
}

private extension SceneDelegate {
    func connectMetricaPush(with options: UIScene.ConnectionOptions) {
        AppMetricaPush.handleSceneWillConnectToSession(with: options)
    }
    
    func requestTrackingPermission() {
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            ATTrackingManager.requestTrackingAuthorization { status in
                logger.info("ATTrackingManager.status: \(status.rawValue)")
            }
        }
    }
    
    @discardableResult
    func handleDeeplinkFromYooKassa(with url: URL) -> Bool {
        return YKSdk.shared.handleOpen(url: url, sourceApplication: nil)
    }
    
    func startCheckingForUpdatesApp(with windowScene: UIWindowScene) {
        let component = rootComponent.bannerUpdateAppCoordinator
        component.makeCoordinator(with: windowScene).start()
    }
}
