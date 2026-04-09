import Foundation

final class AccountHandler {
    
    func converterLoginResponse(with response: AccountResponse) async throws -> Account {
        
        guard let member = response.member else {
            throw NSError(response.message)
        }

        guard member.memberIsActive == 1 else {
            if response.code == 412 {
                return Account(memberId: member.memberId,
                               memberNickname: member.memberAccount,
                               memberBalance: member.memberBalance.splitValue(),
                               memberFirstName: member.memberFirstName,
                               memberLastName: member.memberLastName,
                               memberBirthday: member.memberBirthday,
                               memberPhone: member.memberPhone,
                               memberEmail: member.memberEmail,
                               memberPoints: member.memberPoints,
                               memberBalanceBonus: member.memberBalanceBonus.splitValue(),
                               memberCoinBalance: member.memberCoinBalance.splitValue(),
                               memberIsActive: member.memberIsActive,
                               memberPrivateKey: response.privateKey,
                               needPhoneVerify: response.code == 412,
                               isFirstPayment: member.memberIsFirstPayment)
            } else {
                throw AccountError.accountInactive
            }
        }
        
        if response.code == 3 || response.code == 412 {
            return Account(memberId: member.memberId,
                           memberNickname: member.memberAccount,
                           memberBalance: member.memberBalance.splitValue(),
                           memberFirstName: member.memberFirstName,
                           memberLastName: member.memberLastName,
                           memberBirthday: member.memberBirthday,
                           memberPhone: member.memberPhone,
                           memberEmail: member.memberEmail,
                           memberPoints: member.memberPoints,
                           memberBalanceBonus: member.memberBalanceBonus.splitValue(),
                           memberCoinBalance: member.memberCoinBalance.splitValue(),
                           memberIsActive: member.memberIsActive,
                           memberPrivateKey: response.privateKey,
                           needPhoneVerify: response.code == 412,
                           isFirstPayment: member.memberIsFirstPayment)
        } else {
            throw NSError(response.message)
        }
    }
    
    func converterUpdateAccount(with response: UpdateAccountResponse,
                                privateKey: String) async throws -> Account {
        guard response.code != 404 else {
            throw AccountError.accountInvalid
        }
        
        guard let data = response.data else {
            throw AccountError.networkError
        }
        
        guard data.member.memberIsActive == 1 else {
            throw AccountError.accountInactive
        }
        
        guard response.code != 412 else {
            throw AccountError.verificationRequired
        }
        
        return Account(
            memberId: data.member.memberId,
            memberNickname: data.member.memberAccount,
            memberBalance: data.member.memberBalance.splitValue(),
            memberFirstName: data.member.memberFirstName,
            memberLastName: data.member.memberLastName,
            memberBirthday: data.member.memberBirthday,
            memberPhone: data.member.memberPhone,
            memberEmail: data.member.memberEmail,
            memberPoints: data.member.memberPoints,
            memberBalanceBonus: data.member.memberBalanceBonus.splitValue(),
            memberCoinBalance: data.member.memberCoinBalance.splitValue(),
            memberIsActive: data.member.memberIsActive,
            memberPrivateKey: privateKey,
            needPhoneVerify: response.code == 412,
            isFirstPayment: data.member.memberIsFirstPayment
        )
    }

}

struct Account: Codable {
    let memberId: Int
    let memberNickname: String
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
    let memberPrivateKey: String?
    let needPhoneVerify: Bool
    let isFirstPayment: Bool
}
