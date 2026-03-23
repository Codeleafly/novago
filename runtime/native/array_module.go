package native

import (
	"strings"

	"novago/runtime"
)

func CreateArrayModule() *runtime.ObjectVal {
	arrayProps := make(map[string]runtime.RuntimeVal)

	arrayProps["push"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		arr := args[0].(*runtime.ArrayVal)
		arr.Elements = append(arr.Elements, args[1])
		return runtime.MK_NUMBER(float64(len(arr.Elements)))
	})

	arrayProps["pop"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		arr := args[0].(*runtime.ArrayVal)
		if len(arr.Elements) == 0 {
			return runtime.MK_NULL()
		}
		last := arr.Elements[len(arr.Elements)-1]
		arr.Elements = arr.Elements[:len(arr.Elements)-1]
		return last
	})

	arrayProps["join"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		arr := args[0].(*runtime.ArrayVal)
		sep := ","
		if len(args) > 1 {
			sep = args[1].(*runtime.StringVal).Value
		}
		var strs []string
		for _, e := range arr.Elements {
			strs = append(strs, runtime.PlainStringify(e))
		}
		return runtime.MK_STRING(strings.Join(strs, sep))
	})

	return runtime.MK_OBJECT(arrayProps)
}
