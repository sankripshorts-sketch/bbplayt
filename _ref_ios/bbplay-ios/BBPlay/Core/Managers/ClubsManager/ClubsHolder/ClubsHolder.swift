import Foundation

final class ClubsHolder {
    
    private let selectedClubKey = "selectedClubKey"
    private let storage = UserDefaults.standard
    private var clubs: [String] = []

    private var currentClub: String? {
        get {
            storage.string(forKey: selectedClubKey)
        }
        set {
            guard let newValue = newValue else { return }
            storage.set(newValue, forKey: selectedClubKey)
        }
    }
}

// MARK: - Public -
extension ClubsHolder {
    func setClubs(with clubs: [String]) {
        self.clubs = clubs
    }
    
    func getClubs() -> [String] {
        return clubs
    }
    
    func setCurrentSelectedClub(with currentClub: String) {
        self.currentClub = currentClub
    }
    
    func getClubId() -> String {
        if let currentClub = currentClub {
            return currentClub
        }
        else if let defaultClub = clubs.first {
            return defaultClub
        }
        else {
            return String()
        }
    }
}
