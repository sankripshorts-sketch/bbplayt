import Foundation

struct PricesResponse: Decodable {
    let code: Int
    let message: String
    let data: PricesData
}

// MARK: - PricesData -
extension PricesResponse {
    struct PricesData: Decodable {
        let stepStartBooking: Int
        let timeTechBreak: TimeTechBreak
        let prices: [Price]
        let products: [Product]
        
        private enum CodingKeys: String, CodingKey {
            case stepStartBooking = "step_start_booking"
            case timeTechBreak = "time_tech_break"
            case prices
            case products
        }
    }
}

// MARK: - PricesData.TimeTechBreak -
extension PricesResponse.PricesData {
    struct TimeTechBreak: Decodable {
        let timeStart: String
        let mins: Int
        
        private enum CodingKeys: String, CodingKey {
            case timeStart = "time_start"
            case mins
        }
    }
}

// MARK: - PricesData.Price -
extension PricesResponse.PricesData {
    struct Price: Decodable {
        /// ID родного тарифа
        let priceId: Int
        /// Имя тарифа
        let priceName: String
        /// Цена часа тарифа string (“00.00”)
        let pricePrice1: String
        /// ?
        let duration: Int
        /// Цена с учетом длительности (если отправлялась в запросе) и скидки клиента (если отправлялся ID клиента). string (“00.00”)
        let totalPrice: String
        /// К какой группе (при обсуждении в чате, будет использоваться для определения в какой комнате/зоне работает тариф) относится тариф.
        let groupName: String
        
        private enum CodingKeys: String, CodingKey {
            case priceId = "price_id"
            case priceName = "price_name"
            case pricePrice1 = "price_price1"
            case duration
            case totalPrice = "total_price"
            case groupName = "group_name"
        }
    }
}

// MARK: - PricesData.Product -
extension PricesResponse.PricesData {
    struct Product: Decodable {
        /// ID пакета
        let productId: Int
        /// Имя пакета
        let productName: String
        /// Цена без скидки string (“00.0000000000000”)
        let productPrice: String
        /// Время работы пакета внутри дня. string (“00:00-24:00”)
        let productShowTime: String
        /// Работа пакета в дни недели (для стороны приложения не обязательны, так как со стороны сервера и так проверка).
        /// string (“7|1|2|3|4|5|6”)
        let productShowWeekday: String
        let productEnableClient: Int
        let productEnableDiscount: Int
        /// Длительность пакета в минутах. Длительность на данный момент хранится в названии пакета, после `<<<`, для приложения они вырезаются, и там нормальные названия
        let duration: Int
        /// Минимальная длительность пакета, нужна для пакетов с динамической длительностью, если пакет с фиксированной длительностью, то этот параметр будет равен duration
        let durationMin: Int
        let showProductName: String
        /// Параметр, который определяет с какип типом длительности пакет, true - с динамической (то есть должна подсчитываться от времени начала бронирования), false - с фиксированной длительностью.  Узнается путем разницы длительностей, и если больше 0, значит длительность динамическая.
        let isCalcDuration: Bool
        /// Для удобства прилке, начало времени показа пакета string (“00:00”)
        let productShowTimeStart: String
        /// Конец показа пакета string (“23:59”)
        let productShowTimeEnd: String
        /// Цена с учетом скидки клиента (Если отправлялся ID клиента). string (“00.00”)
        let totalPrice: String
        /// К какой группе (при обсуждении в чате, будет использоваться для определения в какой комнате/зоне работает пакет) относится пакет
        let groupName: String

        private enum CodingKeys: String, CodingKey {
            case productId = "product_id"
            case productName = "product_name"
            case productPrice = "product_price"
            case productShowTime = "product_show_time"
            case productShowWeekday = "product_show_weekday"
            case productEnableClient = "product_enable_client"
            case productEnableDiscount = "product_enable_discount"
            case duration
            case durationMin = "duration_min"
            case showProductName = "show_product_name"
            case isCalcDuration = "is_calc_duration"
            case productShowTimeStart = "product_show_time_start"
            case productShowTimeEnd = "product_show_time_end"
            case totalPrice = "total_price"
            case groupName = "group_name"
        }
    }
}
