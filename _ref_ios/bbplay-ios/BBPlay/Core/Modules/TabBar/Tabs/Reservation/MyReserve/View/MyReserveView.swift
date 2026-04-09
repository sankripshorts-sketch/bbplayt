import Foundation
import UIKit

protocol MyReserveView: AnyObject {
    func updateMyReserveCard(with models: [MyReservePresenterImpl.CardModel])
}
