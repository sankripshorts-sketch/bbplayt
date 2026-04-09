import Foundation
import UIKit

final class SettingsScrollViewDelegate: NSObject, UIScrollViewDelegate {

    private var topMaskHide: EmptyClosure?
    private var topMaskShow: EmptyClosure?
    
    private var botMaskHide: EmptyClosure?
    private var botMaskShow: EmptyClosure?

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        if scrollView.contentOffset.y <= 0.0 {
            topMaskHide?()
        } else if scrollView.contentOffset.y >=  scrollView.contentSize.height - scrollView.frame.height {
            botMaskHide?()
        } else {
            topMaskShow?()
            botMaskShow?()
        }
    }

    func setTopMaskHide(action: @escaping EmptyClosure) {
        topMaskHide = action
    }

    func setTopMaskShow(action: @escaping EmptyClosure) {
        topMaskShow = action
    }
    
    func setBotMaskHide(action: @escaping EmptyClosure) {
        botMaskHide = action
    }
    
    func setBotMaskShow(action: @escaping EmptyClosure) {
        botMaskShow = action
    }
}
