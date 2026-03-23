package native

import (
	"strings"

	"novago/runtime"
)

func CreateStringModule() *runtime.ObjectVal {
	stringProps := make(map[string]runtime.RuntimeVal)

	stringProps["split"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		str := args[0].(*runtime.StringVal).Value
		sep := ""
		if len(args) > 1 {
			sep = args[1].(*runtime.StringVal).Value
		}
		parts := strings.Split(str, sep)
		var elements []runtime.RuntimeVal
		for _, p := range parts {
			elements = append(elements, runtime.MK_STRING(p))
		}
		return runtime.MK_ARRAY(elements)
	})

	stringProps["replace"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		str := args[0].(*runtime.StringVal).Value
		target := args[1].(*runtime.StringVal).Value
		replacement := args[2].(*runtime.StringVal).Value
		return runtime.MK_STRING(strings.Replace(str, target, replacement, 1))
	})

	stringProps["replaceAll"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		str := args[0].(*runtime.StringVal).Value
		target := args[1].(*runtime.StringVal).Value
		replacement := args[2].(*runtime.StringVal).Value
		return runtime.MK_STRING(strings.ReplaceAll(str, target, replacement))
	})

	stringProps["upper"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_STRING(strings.ToUpper(args[0].(*runtime.StringVal).Value))
	})

	stringProps["lower"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_STRING(strings.ToLower(args[0].(*runtime.StringVal).Value))
	})

	stringProps["trim"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_STRING(strings.TrimSpace(args[0].(*runtime.StringVal).Value))
	})

	stringProps["includes"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_BOOL(strings.Contains(args[0].(*runtime.StringVal).Value, args[1].(*runtime.StringVal).Value))
	})

	return runtime.MK_OBJECT(stringProps)
}
