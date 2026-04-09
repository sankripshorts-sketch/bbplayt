import Foundation

struct ErrorResponse: Decodable, Error {
    let code: Int
    let message: String
    
    var localizedDescription: String {
        return "Ошибка запроса. Код: \(code). Сообщение: \(message)"
    }
}
