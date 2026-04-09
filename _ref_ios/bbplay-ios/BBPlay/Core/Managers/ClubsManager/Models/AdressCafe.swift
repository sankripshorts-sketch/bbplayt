struct AdressInfo {
    let adress: String
    let phone: String
    let lat: Double
    let lng: Double
    let website: String
}

struct AdressCafe: Decodable {
    let message: String
    let data: DataInfo?
    
    enum CodingKeys: String, CodingKey {
        case message
        case data
    }
}

struct DataInfo: Decodable {
    let info: LicenseInfo
    
    enum CodingKeys: String, CodingKey {
        case info
    }
}

struct LicenseInfo: Decodable {
    let adress: String
    let phone: String
    let lat: Double
    let lng: Double
    let website: String
    
    enum CodingKeys: String, CodingKey {
        case adress = "license_address"
        case phone = "license_phone"
        case lat
        case lng
        case website = "license_website"
    }
}
