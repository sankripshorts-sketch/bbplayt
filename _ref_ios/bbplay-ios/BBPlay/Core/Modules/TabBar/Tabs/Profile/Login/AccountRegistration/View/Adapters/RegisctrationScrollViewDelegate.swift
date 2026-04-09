import Foundation
import UIKit

final class RegistrationScrollViewDelegate: NSObject, UIScrollViewDelegate {

    private var topActionHide: EmptyClosure?
    private var topActionShow: EmptyClosure?
    
    private var bottomActionHide: EmptyClosure?
    private var bottomActionShow: EmptyClosure?

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        scrollView.contentOffset.y <= 0.0 ? topActionHide?() : topActionShow?()
        scrollView.contentOffset.y >= scrollView.contentSize.height - scrollView.frame.height ? bottomActionShow?() : bottomActionHide?()
    }

    func setTopActionHide(action: @escaping EmptyClosure) {
        topActionHide = action
    }

    func setTopActionShow(action: @escaping EmptyClosure) {
        topActionShow = action
    }
    
    func setBottomActionHide(action: @escaping EmptyClosure) {
        bottomActionHide = action
    }
    
    func setBottomActionShow(action: @escaping EmptyClosure) {
        bottomActionShow = action
    }
}
