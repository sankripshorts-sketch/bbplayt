import Foundation
import UIKit

final class NewsPresenterImpl {
    private static let ownerId = "221562447"

    weak var view: NewsView?

    private let newsNetworkAPI: NewsNetworkAPI
    private let newsNetworkModelConverter: NewsNetworkModelConverter
    private let newsViewModelConverter: NewsViewModelConverter

    init(
        newsNetworkAPI: NewsNetworkAPI = NewsNetworkAPIImpl(with: NewsPresenterImpl.ownerId),
        newsNetworkModelConverter: NewsNetworkModelConverter,
        newsViewModelConverter: NewsViewModelConverter
    ) {
        self.newsNetworkAPI = newsNetworkAPI
        self.newsNetworkModelConverter = newsNetworkModelConverter
        self.newsViewModelConverter = newsViewModelConverter
    }

    private var isLoaded = false

    private func showSkeleton() {
        DispatchQueue.main.async { [self] in
            guard !isLoaded else { return }
            view?.showSkeleton()
        }
    }

    private func loadNews() {
        Task {
            do {
                await MainActor.run {
                    showSkeleton()
                }
                
                let newsResponsse = try await newsNetworkAPI.getNewsFeed()
                let convertNews = newsNetworkModelConverter.converterNewsResponse(with: newsResponsse)
                let newsFeed = await newsViewModelConverter.converterNewsFeed(news: convertNews)
                
                await MainActor.run {
                    isLoaded = true
                    view?.hideSkeleton()
                    view?.update(with: newsFeed.posts)
                    view?.endRefreshing()
                }
            } catch let error {
                logger.error(error)
                isLoaded = isLoaded ? isLoaded : false
            }
        }
    }
}

extension NewsPresenterImpl: NewsPresenter {
    func handlePullToRefresh(with isRefreshing: Bool) {
        guard isRefreshing else { return }
        loadNews()
    }
    
    func postTap(with id: Int) {
        view?.openPost(postId: id, ownerId: NewsPresenterImpl.ownerId)
    }
    
    func onViewDidLoad() {
        loadNews()
    }
}
