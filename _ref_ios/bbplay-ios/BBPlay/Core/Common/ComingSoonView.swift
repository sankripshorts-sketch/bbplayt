import Foundation
import SnapKit

class ComingSoonView: UIView {
    
    let background = UIImageView()
    let title = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        setupBackground()
        setupTitle()
    }
    
    func setupBackground() {
        background.image = Image.backgroundComingSoon()

        addSubview(background)
        background.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    func setupTitle() {
        title.text = Localizable.comingSoon()
        title.textColor = .white
        title.textAlignment = .center
        title.font = Font.dinRoundProBold(size: 16.scale())
        
        background.addSubview(title)
        title.snp.makeConstraints {
            $0.height.equalTo(24.scale())
            $0.centerY.equalToSuperview().offset(-2.scale())
            $0.left.right.equalToSuperview().inset(10.scale())
        }
    }
}
