import Foundation

final class UserData {
    let memberID: Int
    let nickname: String
    let password: String
    var phone: String
    let privateKey: String?
    var encodedData: String?
    var nextRequestSMSTime: Int?

    init(memberID: Int, 
         nickname: String,
         password: String,
         phone: String,
         privateKey: String?,
         encodedData: String? = nil,
         nextRequestSMSTime: Int? = nil) {
        self.memberID = memberID
        self.nickname = nickname
        self.password = password
        self.phone = phone
        self.privateKey = privateKey
        self.encodedData = encodedData
        self.nextRequestSMSTime = nextRequestSMSTime
    }
}
