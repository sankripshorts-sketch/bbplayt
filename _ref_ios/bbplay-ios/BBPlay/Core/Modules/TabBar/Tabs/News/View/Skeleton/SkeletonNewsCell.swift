import Foundation
import SnapKit
import SkeletonView

final class SkeletonNewsCell: BaseCollectionCell {
    
    private let firstLineLeft = UIView()
    private let firstLineRight = UIView()
    private let secondLine = UIView()
    private let thirdLine = UIView()
    
    override func setupUI() {
        firstLineLeft.isSkeletonable = true
        firstLineRight.isSkeletonable = true
        secondLine.isSkeletonable = true
        thirdLine.isSkeletonable = true
        
        firstLineLeft.skeletonCornerRadius = 8
        firstLineRight.skeletonCornerRadius = 8
        secondLine.skeletonCornerRadius = 8
        thirdLine.skeletonCornerRadius = 8

        contentView.backgroundColor = Color.backgroundNewsCell()
        contentView.layer.cornerRadius = 8
        contentView.isSkeletonable = true
        contentView.isUserInteractionDisabledWhenSkeletonIsActive = true
        
        firstLineLeft.isUserInteractionDisabledWhenSkeletonIsActive = true
        firstLineRight.isUserInteractionDisabledWhenSkeletonIsActive = true
        secondLine.isUserInteractionDisabledWhenSkeletonIsActive = true
        thirdLine.isUserInteractionDisabledWhenSkeletonIsActive = true
        
        contentView.addSubview(firstLineLeft)
        firstLineLeft.snp.makeConstraints {
            $0.top.left.equalToSuperview().offset(19.scale())
            $0.right.equalToSuperview().offset(-151.scale())
            $0.height.equalTo(10.scaleIfNeeded())
        }
        
        contentView.addSubview(firstLineRight)
        firstLineRight.snp.makeConstraints {
            $0.left.equalTo(firstLineLeft.snp.right).offset(10.scale())
            $0.top.equalToSuperview().offset(19.scale())
            $0.right.equalToSuperview().inset(34.scale())
            $0.height.equalTo(10.scaleIfNeeded())
        }
        
        contentView.addSubview(secondLine)
        secondLine.snp.makeConstraints {
            $0.top.equalTo(firstLineLeft.snp.bottom).offset(10.scale())
            $0.left.equalToSuperview().inset(19.scale())
            $0.right.equalToSuperview().offset(-221.scale())
            $0.height.equalTo(10.scale())
        }
        
        contentView.addSubview(thirdLine)
        thirdLine.snp.makeConstraints {
            $0.top.equalTo(secondLine.snp.bottom).offset(13.scale())
            $0.left.equalToSuperview().inset(19.scale())
            $0.right.equalToSuperview().offset(-240.scale())
            $0.bottom.equalToSuperview().inset(15.scale())
            $0.height.equalTo(8.scale())
        }
    }
}
