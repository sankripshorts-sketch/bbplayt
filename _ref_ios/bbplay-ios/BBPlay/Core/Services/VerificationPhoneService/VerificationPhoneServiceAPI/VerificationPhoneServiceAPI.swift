import Foundation
import Alamofire

protocol VerificationPhoneServiceAPI {
    func updateNumber(oldPhone: String,
                      newPhone: String,
                      memberID: Int) async throws -> BaseSMSServiceResponse

    func requestSMS(with phone: String, and memberID: Int) async throws -> RequestSMSResponse

    func codeCheck(memberID: Int,
                   code: Int,
                   encodedData: String,
                   privateKey: String) async throws -> BaseSMSServiceResponse
}

// MARK: - VerificationPhoneServiceAPI -
extension NetworkService: VerificationPhoneServiceAPI {
    func updateNumber(oldPhone: String,
                      newPhone: String,
                      memberID: Int) async throws -> BaseSMSServiceResponse {
        let endPoint = "/update"

        let params = [
            "member_id": String(memberID),
            "new_phone": newPhone,
            "old_phone": oldPhone
        ]
        
        return try await request(of: BaseSMSServiceResponse.self,
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }

    func requestSMS(with phone: String, and memberID: Int) async throws -> RequestSMSResponse {
        let endPoint = "/requestsms"
        
        let params = [
            "member_id": String(memberID),
            "member_phone": phone
        ]
        
        return try await request(of: RequestSMSResponse.self,
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }
    
    func codeCheck(memberID: Int,
                   code: Int,
                   encodedData: String,
                   privateKey: String) async throws -> BaseSMSServiceResponse {
        let endPoint = "/verify"
        
        let randomCodeAndKey = getRandomCodeAndKey(memberID: memberID, privateKey: privateKey)
        
        let randomString = randomCodeAndKey.0
        let key = randomCodeAndKey.1
        
        let params: [String: Any] = [
            "member_id": String(memberID),
            "code": code,
            "encoded_data": encodedData,
            "rand_key": randomString,
            "key": key
        ]
        
        return try await request(of: BaseSMSServiceResponse.self,
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }
}

// MARK: - Models
struct BaseSMSServiceResponse: Decodable {
    let code: Int
    let message: String
}

struct RequestSMSResponse: Decodable {
    let code: Int
    let message: String
    let nextRequestSMSTime: Int?
    let encodedData: String?

    enum CodingKeys: String, CodingKey {
        case code
        case message
        case nextRequestSMSTime = "next_request_sms_time"
        case encodedData = "encoded_data"
    }
}
