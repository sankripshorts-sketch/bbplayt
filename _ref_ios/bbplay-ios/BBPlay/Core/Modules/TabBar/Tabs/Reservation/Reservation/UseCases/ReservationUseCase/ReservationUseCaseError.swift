import Foundation

enum ReservationUseCaseError: LocalizedError {
    case accountNotFound
    case reservationDataInputInvalid
    case balanceInvalid
    case parameterInvalid(code: String, message: String)
    case statusCodeInvalid(code: String, message: String)
    
    var errorDescription: String? {
        switch self {
            case .accountNotFound: "Необходимо войти в аккаунт"
            case .balanceInvalid: "Недостаточно средств, пополните баланс"
            case .reservationDataInputInvalid: "Неверный формат данных"
            case .statusCodeInvalid(let code, let message): "Ошибка статус-кода: \(code), \(message)"
            case .parameterInvalid(let code, let message): "Ошибка параметра: \(code), \(message)"
        }
    }

}
