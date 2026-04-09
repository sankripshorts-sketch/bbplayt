import Foundation

struct ProductDisplayItem: Hashable {
    private static let invalidId: Int = -9999

    static var empty: ProductDisplayItem {
        ProductDisplayItem(
            id: invalidId,
            displayName: "Бронирование недоступно"
        )
    }

    let id: Int
    let displayName: String

    var isInvalid: Bool {
        id == ProductDisplayItem.invalidId
    }
}
