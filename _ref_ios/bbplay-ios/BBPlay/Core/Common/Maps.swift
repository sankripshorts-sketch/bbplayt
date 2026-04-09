import Foundation
import MapKit

final class Maps {
    
    func getAlertWithMaps(latitude: Double, longitude: Double) -> UIAlertController? {
       return setupMapsAlert(latitude: latitude, longitude: longitude)
    }
    
    private func setupMapsAlert(latitude: Double, longitude: Double) -> UIAlertController? {
        guard let appleURL = URL(string: "http://maps.apple.com/?daddr=\(latitude),\(longitude)") else {
            logger.error("\(self) apple url missing")
            assertionFailure()
            return nil
        }
        
        guard let googleURL = URL(string: "http://maps.google.com/maps?&daddr=\(latitude),\(longitude)") else {
            logger.error("\(self) google url missing")
            assertionFailure()
            return nil
        }
        
        guard let yandexURL = URL(string: "http://yandex.ru/maps/?ll=\(latitude)%2C\(longitude)&mode=routes&rtext=~\(latitude)%2C\(longitude)&rtt=comparison&ruri=~&z=13") else {
            logger.error("\(self) yandex url missing")
            assertionFailure()
            return nil
        }
        
        var installedNavigationApps = [(Localizable.appleMaps(), appleURL)]
        
        if (UIApplication.shared.canOpenURL(googleURL)) {
            let googleItem = (Localizable.googleMaps(), googleURL)
                installedNavigationApps.append(googleItem)
        }
        
        if (UIApplication.shared.canOpenURL(yandexURL)) {
            let yandexItem = (Localizable.yandexMaps(), yandexURL)
                installedNavigationApps.append(yandexItem)
        }
        
        let alert = UIAlertController(title: "\n \(Localizable.chooseApp())", message: "", preferredStyle: .actionSheet)
        for app in installedNavigationApps {
            let button = UIAlertAction(title: app.0, style: .default, handler: { _ in
                UIApplication.shared.open(app.1, options: [:], completionHandler: nil)
            })
            alert.addAction(button)
        }
        let cancel = UIAlertAction(title: Localizable.cancel(), style: .cancel, handler: nil)
        alert.addAction(cancel)
        return alert
    }
}
