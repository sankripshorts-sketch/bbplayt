import Foundation
import SnapKit

final class ClubsBottomSheetViewController: BaseBottomSheetController {
    
    private let adress: String
    private var mainView: ClubsBottomSheetView
    
    init(adress: String) {
        self.adress = adress
        self.mainView = ClubsBottomSheetView(frame: .zero, adress: adress)
        super.init(with: 357.scale())
        setupAction()
    }
    
    override func setupUI() {
        super.setupUI()
        
        contentView.addSubview(mainView)
        mainView.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupAction() {
        mainView.setTapAction { [weak self] in
            self?.dismiss(animated: true)
        }
    }
}
