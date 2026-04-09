import Foundation

struct AllPrices {
    let stepBooking: Int
    let prices: [NewPrice]
    let products: [NewProduct]
    let timeTechBreak: TimeTechBreak

    var isEmpty: Bool {
        return prices.isEmpty && products.isEmpty
    }

    func toGenericPrices() -> [NewGenericPrice] {
        return prices.sorted(by: { $0.duration < $1.duration })
            .enumerated().map { NewGenericPrice.from(price: $0.element, position: $0.offset) } +
        products.sorted(by: { $0.duration < $1.duration })
            .enumerated().map { NewGenericPrice.from(product: $0.element, position: $0.offset + prices.count + 1) }
    }
}
