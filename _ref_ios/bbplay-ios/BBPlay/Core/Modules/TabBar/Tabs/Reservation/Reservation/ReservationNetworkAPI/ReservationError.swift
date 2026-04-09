import Foundation

enum ReservationError: Error {
    case statusCode
    case emptyData
    
    case insufficientBalance
    case noSuccess
    
    case needAuth
    
    case special(code: Int, message: String)
    
    case reservationDataInputInvalid
}

extension ReservationError: LocalizedError {
    public var errorDescription: String? {
        switch self {
            case .statusCode: return "Ошибка сервера или неправильно сформирован запрос"
            case .emptyData: return "Ошибка получения данных"
            case .insufficientBalance: return "Недостаточный баланс"
            case .needAuth: return "Необходимо войти в аккаунт"
            case .noSuccess: return "Не успешно"
            case .special(code: let code, message: let message): return "Code \(code): \(message)"
            case .reservationDataInputInvalid: return "Неверный формат ввода данных для бронирования"
        }
    }
}
