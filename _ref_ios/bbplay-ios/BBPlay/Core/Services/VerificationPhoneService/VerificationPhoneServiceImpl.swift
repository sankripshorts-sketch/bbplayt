import Foundation

final class VerificationPhoneServiceImpl {
    
    private let networkService: VerificationPhoneServiceAPI
    private let smsServiceDataStorage: SMSServiceDataStorage
    
    init(networkService: VerificationPhoneServiceAPI,
         smsServiceDataStorage: SMSServiceDataStorage) {
        self.networkService = networkService
        self.smsServiceDataStorage = smsServiceDataStorage
    }
}

// MARK: - VerificationPhoneService -
extension VerificationPhoneServiceImpl: VerificationPhoneService {
    func nextSmsTime(memberId: Int) -> Int {
        return smsServiceDataStorage.loadNextRequestSMSTime(memberId)
    }
    
    func updateNumber(with oldPhone: String,
                      newPhone: String,
                      memberId: Int) async throws {
        
        let response = try await networkService.updateNumber(
            oldPhone: oldPhone,
            newPhone: newPhone,
            memberID: memberId
        )

        if response.code == 201 { return }
        throw NSError(response.message)
    }

    func requestSMS(with phone: String, and memberID: Int) async throws {
        let response = try await networkService.requestSMS(with: phone, and: memberID)
        
        switch response.code {
        case 201:
            guard let encodedData = response.encodedData,
                  let nextRequestSMSTime = response.nextRequestSMSTime else {
                throw NSError("Request sms error. \(response.code): \(response.message)")
            }
            
            smsServiceDataStorage.saveEncodedData(encodedData, memberId: memberID)
            smsServiceDataStorage.saveNextRequestSMSTime(nextRequestSMSTime, memberId: memberID)
            logger.info("request sms success")
        case 404: throw VerificationPhoneServiceError.memberNotFound(response.message)
        case 409: throw VerificationPhoneServiceError.phoneVerified(response.message)
        case 429: throw VerificationPhoneServiceError.manyRequests(response.message)
        default: throw NSError("Unexpected response code: \(response.code)")
        }
    }

    func checkCode(with code: Int,
                   memberId: Int,
                   encodedData: String?,
                   privateKey: String) async throws {
        let encodedData = try makeEncodedData(for: encodedData, memberId: memberId)
        let response = try await networkService.codeCheck(memberID: memberId,
                                                          code: code,
                                                          encodedData: encodedData,
                                                          privateKey: privateKey)
        switch response.code {
        case 201: return
        case 409: throw VerificationPhoneServiceError.wrongCode(response.message)
        case 429: throw VerificationPhoneServiceError.limitReached(response.message)
        default: throw NSError("Unexpected response code: \(response.code)")
        }
    }
}

// MARK: - Private -
private extension VerificationPhoneServiceImpl {
    func makeEncodedData(for currentData: String?, memberId: Int) throws -> String {
        if let currentData {
            return currentData
        }

        if let storedData = smsServiceDataStorage.loadEncodedData(memberId) {
            return storedData
        }

        throw NSError("Encoded data is nil")
    }
}
