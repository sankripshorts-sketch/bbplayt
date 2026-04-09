import Foundation

final class ReservationPricesConverter {
    func convertPrices(from response: PricesResponse) async -> AllPrices {
        let prices = response.data.prices
        let products = response.data.products
        let timeTechBreak = response.data.timeTechBreak

        return AllPrices(
            stepBooking: response.data.stepStartBooking,
            prices: prices.map { price -> NewPrice in
                    .init(
                        priceId: price.priceId,
                        priceName: price.priceName,
                        duration: price.duration,
                        price: price.pricePrice1,
                        totalPrice: price.totalPrice,
                        groupName: price.groupName
                    )
            },
            products: products.compactMap { product -> NewProduct? in
                guard
                    let productShowTimeStart = product.productShowTimeStart.convertToLocalTime(),
                    let productShowTimeEnd = product.productShowTimeEnd.convertToLocalTime()
                else {
                    return nil
                }

                let productShowWeekday = convertProductShowWeekday(stringShowWeekday: product.productShowWeekday)

                return .init(
                    productId: product.productId,
                    productName: product.productName,
                    productPrice: product.productPrice,
                    totalPrice: product.totalPrice,
                    productShowWeekday: productShowWeekday,
                    productEnableClient: product.productEnableClient != 0,
                    duration: product.duration,
                    minimalDuration: product.durationMin,
                    isCalcDuration: product.isCalcDuration,
                    productShowTimeStart: productShowTimeStart,
                    productShowTimeEnd: productShowTimeEnd,
                    groupName: product.groupName
                )
            },
            timeTechBreak: .init(
                timeStart: timeTechBreak.timeStart.convertToLocalTime(),
                mins: timeTechBreak.mins
            )
        )
    }

    private func convertProductShowWeekday(
        stringShowWeekday: String
    ) -> Set<DayOfWeek> {
        let components = stringShowWeekday.split(separator: "|")
        let daysOfWeek = Set(
            components.compactMap { dayStringIndex -> DayOfWeek? in
                guard let dayIndex = Int(dayStringIndex) else { return nil }
                return .init(rawValue: dayIndex)
            }
        )

        assert(components.count == daysOfWeek.count, "должно совпадать")
        return daysOfWeek
    }
}

//MARK: - PriceInfo
struct PriceInfo {
    let priceList: [Price]
    let bookingProducts: BookingProducts
}

struct Price {
    let type: ProductType
    let time: String
    let priceGameZone: String?
    let priceBootCamp: String?
    
    enum ProductType: Comparable {
        case hour
        case morning
        case threeHours
        case fiveHours
        case night
    }
    
    var title: String {
        switch self.type {
            case .hour: return "1 час"
            case .morning: return "Утро"
            case .threeHours: return "3 часа"
            case .fiveHours: return "5 часов"
            case .night: return "Ночь"
        }
    }
}

// MARK: - BookingProducts -
struct BookingProducts {
    //    let hoursProducts: [Product]
    let gameZoneProducts: [Product]
    let bootCampProducts: [Product]
}

class Product {
    let id: Int
    let name: String
    let zoneType: ZoneType
    let productType: GenericProductType
    var enableTime: String
    var showTime: String
    let price: String
    
    init(id: Int,
         name: String,
         zoneType: ZoneType,
         productType: GenericProductType,
         enableTime: String,
         showTime: String,
         price: String) {
        self.id = id
        self.name = name
        self.zoneType = zoneType
        self.productType = productType
        self.enableTime = enableTime
        self.showTime = showTime
        self.price = price
    }
}

enum ZoneType {
    case gameZone, bootCamp, unknown
}
