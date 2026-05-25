# Native Fallback

The fallback worker is a persistent process. It is not the default path.

## Protocol

Input line:

```json
{"id":"1","mode":"class-or-trigger","path":"Hello.cls","source":"public class Hello {}"}
```

Output line:

```json
{"id":"1","ok":true,"document":{"kind":"apex-document"}}
```

Error line:

```json
{"id":"1","ok":false,"diagnostics":[{"severity":"error","code":"APEXPARSE001","message":"parse failed"}]}
```
