package mobi.blackbears.bbplay.common.fragment

import android.os.Bundle
import android.view.*
import androidx.viewbinding.ViewBinding
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

abstract class BindingBottomFragment <VB: ViewBinding>(
    private val inflater: BindingInflate<VB>
): BottomSheetDialogFragment() {
    private var _binding: VB? = null
    val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedState: Bundle?): View? {
        return inflater(inflater, container, false)
            .also { _binding = it }
            .root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}