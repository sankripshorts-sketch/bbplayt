import Foundation

// Пока так, не додумался на скорую руку как отличить успех от ошибки, которую бек шлет.
// поля совпадают code и message совпадают, а в сервисе дженерик.
final class DefaultErrorValidation: ErrorValidation {
    func validate(from data: Data) throws {
        let error = try JSONDecoder().decode(ErrorResponse.self, from: data)

        if error.code != 0 || error.message != "Success" {
            throw error
        }
    }
}
