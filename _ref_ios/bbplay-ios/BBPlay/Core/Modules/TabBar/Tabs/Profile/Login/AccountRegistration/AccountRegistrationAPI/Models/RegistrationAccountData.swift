import Foundation

struct RegistrationAccountData {
    let nickname: String
    let phone: String
    let mail: String
    let name: String
    let surname: String
    let date: String
    let password: String

    var parameters: [String: String] {
        return [
            "member_account": nickname,
            "member_phone": phone,
            "member_email": mail,
            "member_first_name": name,
            "member_last_name": surname,
            "member_birthday": date.convertBirthdayToBack(),
            "member_password": password,
            "member_confirm": password
        ]
    }
}
