import Foundation

struct AnalyticEventParameters {
    let error: String?
    let sum: String?
    
    private init(error: String? = nil,
                 sum: String? = nil) {
        self.error = error
        self.sum = sum
    }
    
    static func createErrorParams(with error: String?) -> AnalyticEventParameters {
        return AnalyticEventParameters(error: error)
    }
    
    static func createAmountParams(with amount: String) -> AnalyticEventParameters {
        return AnalyticEventParameters(sum: amount)
    }
    
    var customParameters: [String: Any] {
        var dict = [String: Any]()
        
        if let error = error {
            dict["error"] = error
        }
        
        if let sum = sum {
            dict["summa"] = sum
        }
        
        return dict
    }
}

enum AnalyticEventName {
    case loginError
    case loginSuccess
    case registrationError
    case registrationSuccess
    case profileChangePassword
    case paymentProfileTapButton
    case paymentReplenishTapWithAmount
    case paymentRequestCreateOrder
    case paymentOpen3ds
    case paymentSheetLoader
    case paymentGreenCheck
    case paymentRedCross
    case paymentGrayClock
    
    var localized: String {
        switch self {
            case .loginError: return "Вход: ошибка"
            case .loginSuccess: return "Вход: успешно"
            case .registrationError: return "Регистрация: ошибка"
            case .registrationSuccess: return "Регистрация: успешно"
            case .profileChangePassword: return "Профиль: пароль изменён"
            case .paymentProfileTapButton: return "Оплата: нажал кнопку пополнить в профиле"
            case .paymentReplenishTapWithAmount: return "Оплата: нажал кнопку пополнить"
            case .paymentRequestCreateOrder: return "Оплата: запрос на создание платежа отправлен"
            case .paymentOpen3ds: return "Оплата: открытие 3ds"
            case .paymentSheetLoader: return "Оплата: шторка-лоадер"
            case .paymentGreenCheck: return "Оплата: зелёная галка"
            case .paymentRedCross: return "Оплата: красный крест"
            case .paymentGrayClock: return "Оплата: серые часы"
        }
    }
}
