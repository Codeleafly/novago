package native

import (
	"math"

	"novago/runtime"
)

func CreateMathModule() *runtime.ObjectVal {
	mathProps := make(map[string]runtime.RuntimeVal)

	mathProps["sqrt"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Sqrt(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["abs"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Abs(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["pi"] = runtime.MK_NUMBER(math.Pi)
	mathProps["e"] = runtime.MK_NUMBER(math.E)
	mathProps["sin"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Sin(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["cos"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Cos(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["tan"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Tan(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["floor"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Floor(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["ceil"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Ceil(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["round"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Round(args[0].(*runtime.NumberVal).Value))
	})
	mathProps["pow"] = runtime.MK_NATIVE_FN(func(args []runtime.RuntimeVal, env *runtime.Environment) runtime.RuntimeVal {
		return runtime.MK_NUMBER(math.Pow(args[0].(*runtime.NumberVal).Value, args[1].(*runtime.NumberVal).Value))
	})

	return runtime.MK_OBJECT(mathProps)
}
