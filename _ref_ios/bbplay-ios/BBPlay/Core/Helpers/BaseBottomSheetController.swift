import Foundation
import SnapKit

class BaseBottomSheetController: UIViewController {
    
    private let transition: PanelTransition
    private let gripView = UIView()

    let contentView = UIView()
    
    init(with height: CGFloat) {
        self.transition = PanelTransition(height: height)
        super.init(nibName: nil, bundle: nil)
        transitioningDelegate = transition
        modalPresentationStyle = .custom
        
        setupUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func loadView() {
        view = contentView
    }
    
    func setDriverEnabled(with enabled: Bool) {
        transition.setDriverEnabled(with: enabled)
    }
    
    func setupUI() {
        contentView.backgroundColor = Color.background()
        contentView.layer.cornerRadius = 16
        contentView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        
        setupGripView()
    }

    private func setupGripView() {
        gripView.backgroundColor = Color.inactiveRightIconTextField()
        gripView.layer.cornerRadius = 3
        
        contentView.addSubview(gripView)
        gripView.snp.makeConstraints {
            $0.top.equalTo(view).offset(12.scale())
            $0.centerX.equalTo(view)
            $0.height.equalTo(5.scale())
            $0.width.equalTo(35.scale())
        }
    }
}
