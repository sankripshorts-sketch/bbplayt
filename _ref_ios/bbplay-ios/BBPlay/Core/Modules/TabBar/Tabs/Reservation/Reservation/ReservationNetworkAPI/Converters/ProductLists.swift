import Foundation

enum GameZoneProductList: Int, CaseIterable {
    
    init?(id: Int) {
        self.init(rawValue: id)
    }

//    case bookingGameZoneMorningPack = 1591201041
    case bookingGameZone3HoursPack = 1591201037
    case bookingGameZone5HoursPack = 1591201033
    case bookingGameZoneNightPack = 1591201023

    case gameZoneHour = 62853
//    case gameZoneMorningPack = 76861071
    case gameZone3HoursPack = 76860963
    case gameZone5HoursPack = 76860965
    case gameZoneNightPack = 76860971
    
    case unknown = -1
    
    var productName: String {
        switch self {
            case .gameZoneHour: return "GameZone 1 час"
//            case .bookingGameZoneMorningPack, .gameZoneMorningPack: return "GameZone утро"
            case .bookingGameZone3HoursPack, .gameZone3HoursPack: return "GameZone 3 часа"
            case .bookingGameZone5HoursPack, .gameZone5HoursPack: return "GameZone 5 часов"
            case .bookingGameZoneNightPack, .gameZoneNightPack: return "GameZone Night"
            case .unknown: return "Unknown"
        }
    }
    
    var zoneType: ZoneType {
        switch self {
            case .unknown: return .unknown
            default: return .gameZone
        }
    }
    
    var equalToBooking: Self {
        switch self {
            case .gameZoneHour: return .gameZoneHour
//            case .bookingGameZoneMorningPack: return .gameZoneMorningPack
            case .bookingGameZone3HoursPack: return .gameZone3HoursPack
            case .bookingGameZone5HoursPack: return .gameZone5HoursPack
            case .bookingGameZoneNightPack: return .gameZoneNightPack
            default: return .unknown
        }
    }
    
    static var bookingCases: [Self] {
        return [.gameZoneHour,
//                .bookingGameZoneMorningPack,
                .bookingGameZone3HoursPack,
                .bookingGameZone5HoursPack,
                .bookingGameZoneNightPack]
    }
    
    var genericType: GenericProductType {
        switch self {
            case .gameZoneHour: return .hour
//            case .bookingGameZoneMorningPack: return .morningPack
            case .bookingGameZone3HoursPack: return .threeHoursPack
            case .bookingGameZone5HoursPack: return .fiveHoursPack
            case .bookingGameZoneNightPack: return .nightPack
            default: return .unknown
        }
    }
}

enum BootCampProductList: Int, CaseIterable {
    
    init?(id: Int) {
        self.init(rawValue: id)
    }
    
    case bootCampHour = 62855
//    case bookingBootCampMorningPack = 1591201043
    case bookingBootCamp3HoursPack = 1591201039
    case bookingBootCamp5HoursPack = 1591201035
    case bookingBootCampNightPack = 1591201031
    
//    case bootCampMorningPack = 76861073
    case bootCamp3HoursPack = 76860967
    case bootCamp5HoursPack = 76860979
    case bootCampNightPack = 76860973
    
    case unknown = -1
    
    var productName: String {
        switch self {
            case .bootCampHour: return "BootCamp 1 час"
//            case .bootCampMorningPack, .bookingBootCampMorningPack: return "BootCamp утро"
            case .bootCamp3HoursPack, .bookingBootCamp3HoursPack: return "BootCamp 3 часа"
            case .bootCamp5HoursPack, .bookingBootCamp5HoursPack: return "BootCamp 5 часов"
            case .bootCampNightPack, .bookingBootCampNightPack: return  "BootCamp Night"
            case .unknown: return "Unknown"
        }
    }
    
    var zoneType: ZoneType {
        switch self {
            case .unknown: return .unknown
            default: return .bootCamp
        }
    }
    
    var equalToBooking: Self {
        switch self {
            case .bootCampHour: return .bootCampHour
//            case .bookingBootCampMorningPack: return .bootCampMorningPack
            case .bookingBootCamp3HoursPack: return .bootCamp3HoursPack
            case .bookingBootCamp5HoursPack: return .bootCamp5HoursPack
            case .bookingBootCampNightPack: return .bootCampNightPack
            default: return .unknown
        }
    }
    
    static var bookingCases: [Self] {
        return [.bootCampHour,
//                .bookingBootCampMorningPack,
                .bookingBootCamp3HoursPack,
                .bookingBootCamp5HoursPack,
                .bookingBootCampNightPack]
    }
    
    var genericType: GenericProductType {
        switch self {
            case .bootCampHour: return .hour
//            case .bookingBootCampMorningPack: return .morningPack
            case .bookingBootCamp3HoursPack: return .threeHoursPack
            case .bookingBootCamp5HoursPack: return .fiveHoursPack
            case .bookingBootCampNightPack: return .nightPack
            default: return .unknown
        }
    }
}
