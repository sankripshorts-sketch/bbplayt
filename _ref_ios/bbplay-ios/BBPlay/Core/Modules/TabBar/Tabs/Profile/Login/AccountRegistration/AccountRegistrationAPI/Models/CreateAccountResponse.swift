import Foundation

struct CreateAccountResponse: Decodable {
    let code: Int
    let message: String
    let data: CreatedAccountData?
    let privateKey: String?

    enum CodingKeys: String, CodingKey {
        case code
        case message
        case data = "data"
        case privateKey = "private_key"
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        if let intCode = try? container.decode(Int.self, forKey: .code) {
            self.code = intCode
        } else if let stringCode = try? container.decode(String.self, forKey: .code), let intCode = Int(stringCode) {
            self.code = intCode
        } else if let numberCode = try? container.decode([String:Any].self, forKey: .code), let intCode = numberCode["code"] as? Int {
            self.code = intCode
        } else {
            self.code = try container.decode(Int.self, forKey: .code)
        }

        self.message = try container.decode(String.self, forKey: .message)
        self.data = try container.decodeIfPresent(CreatedAccountData.self, forKey: .data)
        self.privateKey = try container.decodeIfPresent(String.self, forKey: .privateKey)
    }
}

struct CreatedAccountData: Decodable {
    let memberId: Int
    
    enum CodingKeys: String, CodingKey {
        case memberId = "member_id"
    }
}
