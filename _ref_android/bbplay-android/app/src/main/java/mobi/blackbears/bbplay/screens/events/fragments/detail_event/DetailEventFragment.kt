package mobi.blackbears.bbplay.screens.events.fragments.detail_event

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.constraintlayout.motion.widget.MotionLayout
import androidx.core.view.isInvisible
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import coil.api.load
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentDetailEventBinding
import mobi.blackbears.bbplay.screens.events.di.DaggerEventComponent
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.adapter.DetailEventAdapter
import javax.inject.Inject

class DetailEventFragment :
    BindingFragment<FragmentDetailEventBinding>(FragmentDetailEventBinding::inflate) {
    private val args: DetailEventFragmentArgs by navArgs()

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<DetailEventViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerEventComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewModel.getDetailEventById(args.eventId)
        setSwipeToRefresh()
        setRewardText()
        setLoader()
        setImage()
        setTitleTimeAndDescription()
        setOptions()
        setMembers()
        setNavigate()
        setBtnState()
        observeMessage()
    }

    private fun setSwipeToRefresh() {
        binding.root.setOnRefreshListener {
            viewModel.getDetailEvent()
            binding.root.isRefreshing = false
        }
        /*Swipe to refresh перехватывает все события, и когда мы пытаемся проскролить вниз,
          у нас дергается swipe. Чтобы этого избежать проверяю, что если child view это Motion
          и у него прогресс 1 (то есть свернут), то запрещаем swipe вызываться, пока у нас экран
          не перейдет в начальное положение.
         */
        binding.root.setOnChildScrollUpCallback { _, child ->
            child is MotionLayout && child.progress == 1f
        }
    }

    private fun setRewardText() {
        with(binding.headerDetailEvent.rewardHeader) {
            tvFirstPlaceReward.text = getString(R.string.show_balance, FIRST_PLACE_REWARD_AMOUNT)
            tvSecondPlaceReward.text = getString(R.string.show_balance, SECOND_PLACE_REWARD_AMOUNT)
            tvThirdPlaceReward.text = getString(R.string.show_balance, THIRD_PLACE_REWARD_AMOUNT)
        }
    }

    private fun setLoader() {
        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.progressBar.root.alpha = it
        }
    }

    private fun setImage() {
        viewModel.imageRes.observe(viewLifecycleOwner) {
            if (it == -1) return@observe
            binding.headerDetailEvent.ivEventHeader.load(it)
        }
    }

    private fun setTitleTimeAndDescription() {
        viewModel.titleEvent.observe(viewLifecycleOwner) {
            binding.headerDetailEvent.tvTitleEvent.text =
                getString(R.string.event_by_format_text, it.replace(",", ", "))
        }

        viewModel.eventDescription.observe(viewLifecycleOwner) {
            binding.headerDetailEvent.tvEventDescription.text = it
        }

        viewModel.timeEvent
            .map { (startTime, endTime) -> getStringFormatByStartAndEndDate(startTime, endTime) }
            .combine(viewModel.isActiveEvent) { timeText, isActive -> timeText to isActive }
            .observe(viewLifecycleOwner) { (timeText, isActive) ->
                val text = if (isActive) timeText else getString(R.string.event_finished)
                val colorRes = if (isActive) R.color.green_light_success else R.color.red_event_end
                binding.headerDetailEvent.timeEvent.text = text
                binding.headerDetailEvent.timeEvent.setTextColor(resources.getColor(colorRes, requireContext().theme))
            }
    }

    private fun setOptions() {
        /* У нас нет сортировки и изменения текста в шапке топа игроков.
         * Поэтому просто хардкодим текст - "очки", и делаем невидимой кнопку сортировки. */
        with(binding.topPlayersHeader.optionsTop) {
            tvSortTitle.text = getString(R.string.points_text)
            ivSortingRanks.isInvisible = true
        }
    }

    private fun setMembers() {
        val adapter = DetailEventAdapter()
        binding.topPlayersHeader.rvTopPlayers.adapter = adapter
        viewModel.membersOfEvent.observe(viewLifecycleOwner) {
            adapter.submitList(it)
        }
    }

    private fun setNavigate() {
        binding.ivEventNavigateUp.setBlockingClickListener {
            findNavController().navigateUp()
        }
        binding.btnHowJoin.setBlockingClickListener {
            viewModel.navigateToJoinEventBottomFragment()
        }
        viewModel.navCommand.observe(viewLifecycleOwner, observer = findNavController()::safeNavigate)
    }

    private fun setBtnState() {
        binding.btnGetReward.setBlockingClickListener {
            viewModel.onGetRewardClick()
        }

        viewModel.isVisibleJoinEventButton.observe(viewLifecycleOwner) {
            binding.btnHowJoin.isVisible = it
            binding.btnGetReward.isVisible = !it
        }

        viewModel.textResOnButton
            .combine(viewModel.isRewardEnabled) { decorator, isEnabled -> decorator to isEnabled }
            .observe(viewLifecycleOwner) { (decorator, isEnabled) ->
                binding.btnGetReward.text = decorator.getStringById(requireContext())
                binding.btnGetReward.isEnabled = isEnabled
            }
    }

    private fun observeMessage() {
        viewModel.messageFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), getString(it), Toast.LENGTH_SHORT).show()
        }
    }
}