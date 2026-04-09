import UIKit
import NeedleFoundation
import Rswift
import FirebaseCore
import FirebaseAnalytics
import FirebaseCrashlytics
import AppMetricaCore
import AppMetricaPush
import UserNotifications
import YooKassaPayments

private var crashlyticsApp: Crashlytics {
    return Crashlytics.crashlytics()
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    enum AppConstantsKeys {
        static let apiKey = "c1ae9efc-d6fd-41f3-96b2-36f8c2fa335f"
        static let idApp = "4375372"
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        validateResources()
        setupFirebaseCrashlytics()
        setupAppMetrica()
        registerAPNs(with: application)
        setMetricaDelegate()
        registerProviderFactories()
        return true
    }

    // MARK: UISceneSession Lifecycle

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Called when a new scene session is being created.
        // Use this method to select a configuration to create the new scene with.
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
    
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        return .portrait
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        registerRemoteNotification(deviceToken: deviceToken)
    }
    
    private func registerRemoteNotification(deviceToken: Data) {
        let pushEnvironment: AppMetricaPushEnvironment
        switch Environment.current {
            case .dev:
                pushEnvironment = .development
            case .prod:
                pushEnvironment = .production
        }
        AppMetricaPush.setDeviceTokenFrom(deviceToken, pushEnvironment: pushEnvironment)
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any]) {
        handlePushNotification(userInfo)
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        handlePushNotification(userInfo)
        completionHandler(.newData)
    }
    
    func application( _ application: UIApplication, open url: URL, sourceApplication: String?, annotation: Any) -> Bool {
        return YKSdk.shared.handleOpen(url: url, sourceApplication: sourceApplication)
    }
    
    // TODO: создать класс с хранилищами, и перенести логику из этого метода туда
    func applicationWillTerminate(_ application: UIApplication) {
        let storage = UserDefaults.standard
        storage.removeObject(forKey: DatePickerPresenterImpl.Keys.reservationDate)
        storage.removeObject(forKey: reservationTimeKey)
        storage.removeObject(forKey: reservationDurationKey)
    }
}

private extension AppDelegate {
    func setupFirebaseCrashlytics() {
        FirebaseApp.configure()
        crashlyticsApp.setCrashlyticsCollectionEnabled(true)
    }
    
    func setupAppMetrica() {
        guard
            let configuration = AppMetricaConfiguration.init(
                apiKey: AppConstantsKeys.apiKey
            )
        else {
            logger.error("YMMYandexMetricaConfiguration is nil")
            return
        }

        guard
            let preloadInfo = AppMetricaPreloadInfo.init(
                trackingIdentifier: AppConstantsKeys.idApp
            )
        else {
            logger.error("YMMYandexMetricaPreloadInfo is nil")
            return
        }
        
        configuration.preloadInfo = preloadInfo
        configuration.locationTracking = false
        AppMetrica.activate(with: configuration)
    }

    func registerAPNs(with application: UIApplication) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options:[.badge, .alert, .sound]) { (granted, error) in
            logger.info("push notification is granted: \(granted)")
            guard granted else { return }
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
    }

    // MARK: - Handle push
    func handlePushNotification(_ userInfo: [AnyHashable : Any]) {
        AppMetricaPush.handleRemoteNotification(userInfo)
    }
    
    func setMetricaDelegate() {
        let delegate = AppMetricaPush.userNotificationCenterDelegate
        UNUserNotificationCenter.current().delegate = delegate
    }
    
    func validateResources() {
        do {
           try R.validate()
        }
        catch let error {
            let message = "Validate error with \(error)"
            logger.error(message)
            assertionFailure(message)
        }
    }
}
