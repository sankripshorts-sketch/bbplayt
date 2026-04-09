import Foundation
import SnapKit

class BaseView: UIView {
    
    init() {
        super.init(frame: .zero)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    func setupUI() {}
}
