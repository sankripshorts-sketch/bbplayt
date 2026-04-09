import Foundation
import UIKit
import SkeletonView

final class SkeletonDataSource: NSObject {
    
    private let skeletonGradient = SkeletonGradient(baseColor: Color.sceletonColor()!)
    private let collectionView: UICollectionView
    
    init(collectionView: UICollectionView) {
        self.collectionView = collectionView
    }
}

extension SkeletonDataSource: SkeletonCollectionViewDataSource {
    func collectionSkeletonView(_ skeletonView: UICollectionView, cellIdentifierForItemAt indexPath: IndexPath) -> SkeletonView.ReusableCellIdentifier {
        return SkeletonNewsCell.identifier
    }

    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return 30
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: SkeletonNewsCell.identifier, for: indexPath) as? SkeletonNewsCell else {
            return UICollectionViewCell()
        }
        
        cell.contentView.showAnimatedGradientSkeleton(usingGradient: skeletonGradient)
        return cell
    }
    
    func collectionSkeletonView(_ skeletonView: UICollectionView, skeletonCellForItemAt indexPath: IndexPath) -> UICollectionViewCell? {
        guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: SkeletonNewsCell.identifier, for: indexPath) as? SkeletonNewsCell else {
            return UICollectionViewCell()
        }

        cell.contentView.showAnimatedGradientSkeleton(usingGradient: skeletonGradient)
       // collectionView.reloadItems(at: [indexPath])
        return cell
    }
}
