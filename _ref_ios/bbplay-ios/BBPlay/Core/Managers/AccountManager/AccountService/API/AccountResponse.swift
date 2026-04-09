import Foundation

// MARK: - AccountResponse -
struct AccountResponse: Decodable {
    let code: Int
    let message: String
    let privateKey: String?
    let member: AccountMemberResponse?
    
    enum CodingKeys: String, CodingKey {
        case code
        case message
        case privateKey = "private_key"
        case member
    }
}

struct AccountMemberResponse: Decodable {
    let memberId: Int
    let memberAccount: String
    let memberBalance: String
    let memberFirstName: String
    let memberLastName: String
    let memberBirthday: String
    let memberPhone: String
    let memberEmail: String
    let memberPoints: String
    let memberBalanceBonus: String
    let memberCoinBalance: String
    let memberIsActive: Int
    let memberIsFirstPayment: Bool
    
    enum CodingKeys: String, CodingKey {
        case memberId = "member_id"
        case memberAccount = "member_account"
        case memberBalance = "member_balance"
        case memberFirstName = "member_first_name"
        case memberLastName = "member_last_name"
        case memberBirthday = "member_birthday"
        case memberPhone = "member_phone"
        case memberEmail = "member_email"
        case memberPoints = "member_points"
        case memberBalanceBonus = "member_balance_bonus"
        case memberCoinBalance = "member_coin_balance"
        case memberIsActive = "member_is_active"
        case memberIsFirstPayment = "member_is_first_payment"
    }
}

// MARK: - Password Change -
struct PasswordChangeResponse: Decodable {
    let code: Int
    let message: String
}

// MARK: - UpdateAccountResponse -

struct UpdateAccountResponse: Decodable {
    let code: Int
    let message: String
    let data: AccountDataResponse?
}

struct AccountDataResponse: Decodable {
    let member: AccountMemberResponse
}
