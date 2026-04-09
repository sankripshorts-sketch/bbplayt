import Foundation
import SnapKit

final class BonusImage: UIView {
    
    private let mainImage = UIImageView()
    private let forSumLabel = UILabel()
    private let bonusSumLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
}

// MARK: - Private extension -
private extension BonusImage {
    func setupUI() {
        setupMainImage()
        setupForSumLabel()
        setupBonusSumLabel()
    }
    
    func setupMainImage() {
        addSubview(mainImage)
        
        mainImage.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    func setupForSumLabel() {
        forSumLabel.font = Font.dinRoundProBold(size: 16.scale())
        addSubview(forSumLabel)
        
        forSumLabel.snp.makeConstraints {
            $0.centerX.equalTo(snp.right).multipliedBy(0.25)
            $0.centerY.equalToSuperview()
        }
    }
    
    func setupBonusSumLabel() {
        bonusSumLabel.font = Font.dinRoundProBold(size: 16.scale())
        addSubview(bonusSumLabel)
        
        bonusSumLabel.snp.makeConstraints {
            $0.centerX.equalTo(snp.right).multipliedBy(0.75)
            $0.centerY.equalToSuperview()
        }
    }
}

// MARK: - Public extension -
extension BonusImage {
    func setImageAndLabels(
        image: UIImage, 
        forSumText: String,
        bonusSumText: String,
        bonusSumTextColor: UIColor) {
        mainImage.image = image
        forSumLabel.text = forSumText
        bonusSumLabel.text = bonusSumText
        bonusSumLabel.textColor = bonusSumTextColor
    }
}
