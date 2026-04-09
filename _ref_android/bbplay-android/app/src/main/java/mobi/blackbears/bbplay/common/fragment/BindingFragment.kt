package mobi.blackbears.bbplay.common.fragment

import android.os.Bundle
import android.view.*
import androidx.fragment.app.Fragment
import androidx.viewbinding.ViewBinding

internal typealias BindingInflate<T> = (LayoutInflater, ViewGroup?, Boolean) -> T

abstract class BindingFragment <VB: ViewBinding>(private val inflater: BindingInflate<VB>) : Fragment() {
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