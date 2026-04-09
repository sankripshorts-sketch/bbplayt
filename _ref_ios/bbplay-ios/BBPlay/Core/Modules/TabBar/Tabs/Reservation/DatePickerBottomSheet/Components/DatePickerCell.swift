import Foundation

final class DatePickerCell: PickerItemCell {}

extension DatePickerCell {
    func update(with text: String) {
        title.text = text
        title.textColor = .white
    }
}

final class DurationPickerCell: PickerItemCell {
    
    private(set) var hours: Int?
    private(set) var minutes: Int?
    
    override func setupTitle() {
        super.setupTitle()
        title.adjustsFontSizeToFitWidth = true
        title.numberOfLines = 1
        title.minimumScaleFactor = 0.4
    }
}

extension DurationPickerCell {
    func update(with product: ProductDisplayItem) {
        title.text = product.displayName
        title.textColor = .white
    }
}
