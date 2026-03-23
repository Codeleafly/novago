package native

import (
	"io"
	"os"

	nruntime "novago/runtime"
)

func CreateFSModule() *nruntime.ObjectVal {
	fsProps := make(map[string]nruntime.RuntimeVal)

	fsProps["read"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		data, err := os.ReadFile(path)
		if err != nil {
			return nruntime.MK_NULL()
		}
		return nruntime.MK_STRING(string(data))
	})

	fsProps["write"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		data := args[1].(*nruntime.StringVal).Value
		err := os.WriteFile(path, []byte(data), 0644)
		if err != nil {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(true)
	})

	fsProps["append"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		data := args[1].(*nruntime.StringVal).Value
		f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return nruntime.MK_BOOL(false)
		}
		defer f.Close()
		if _, err := f.WriteString(data); err != nil {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(true)
	})

	fsProps["exists"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		_, err := os.Stat(path)
		if err == nil {
			return nruntime.MK_BOOL(true)
		}
		if os.IsNotExist(err) {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(false)
	})

	fsProps["delete"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		err := os.RemoveAll(path)
		if err != nil {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(true)
	})

	fsProps["mkdir"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		err := os.MkdirAll(path, 0755)
		if err != nil {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(true)
	})

	fsProps["copy"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		src := args[0].(*nruntime.StringVal).Value
		dst := args[1].(*nruntime.StringVal).Value
		err := copyFile(src, dst)
		return nruntime.MK_BOOL(err == nil)
	})

	fsProps["move"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		src := args[0].(*nruntime.StringVal).Value
		dst := args[1].(*nruntime.StringVal).Value
		err := os.Rename(src, dst)
		return nruntime.MK_BOOL(err == nil)
	})

	fsProps["rename"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		old := args[0].(*nruntime.StringVal).Value
		new := args[1].(*nruntime.StringVal).Value
		err := os.Rename(old, new)
		return nruntime.MK_BOOL(err == nil)
	})

	fsProps["isFile"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		stat, err := os.Stat(path)
		if err != nil {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(!stat.IsDir())
	})

	fsProps["isDir"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		path := args[0].(*nruntime.StringVal).Value
		stat, err := os.Stat(path)
		if err != nil {
			return nruntime.MK_BOOL(false)
		}
		return nruntime.MK_BOOL(stat.IsDir())
	})

	fsProps["list"] = nruntime.MK_NATIVE_FN(func(args []nruntime.RuntimeVal, env *nruntime.Environment) nruntime.RuntimeVal {
		dir := args[0].(*nruntime.StringVal).Value
		entries, err := os.ReadDir(dir)
		if err != nil {
			return nruntime.MK_ARRAY([]nruntime.RuntimeVal{})
		}
		var files []nruntime.RuntimeVal
		for _, e := range entries {
			files = append(files, nruntime.MK_STRING(e.Name()))
		}
		return nruntime.MK_ARRAY(files)
	})

	return nruntime.MK_OBJECT(fsProps)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
