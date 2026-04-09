import Foundation

protocol VerificationPhoneService {
    func nextSmsTime(memberId: Int) -> Int
    
    func updateNumber(with oldPhone: String,
                      newPhone: String,
                      memberId: Int) async throws

    func requestSMS(with phone: String, and memberID: Int) async throws
    func checkCode(with code: Int,
                   memberId: Int,
                   encodedData: String?,
                   privateKey: String) async throws
}
