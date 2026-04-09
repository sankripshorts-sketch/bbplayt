import Foundation
import SnapKit

final class PriceBottomSheetAlert: BaseBottomSheetController {
    
    private let mainView = PriceBottomSheetViewImpl()
    private let presenter: PriceBottomSheetPresenter
    private let priceInfo: PriceInfo
    private let adress: String
    
    init(priceInfo: PriceInfo,
         presenter: PriceBottomSheetPresenter, adress: String) {
        self.priceInfo = priceInfo
        self.presenter = presenter
        self.adress = adress
        super.init(with: 559.scale())
        
        setupActions()
    }

    override func setupUI() {
        super.setupUI()
        
        contentView.addSubview(mainView)
        mainView.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }

        mainView.update(with: priceInfo, adress: adress)
    }
    
    func setupActions() {
        mainView.setAction { [weak self] in
            self?.dismiss(animated: true)
        }
    }
}
