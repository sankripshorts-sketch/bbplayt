import Foundation

struct SelectedPCModel: Equatable {
    let name: String
    let isUsing: Bool
    let dateStart: String?
    let timeStart: LocalTime?
    let groupName: String
}
