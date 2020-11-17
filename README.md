**Create Session**

Tipo: GET
URL: localhost:3000/chatbot/

HTTP: 201

Response:
```
	{
		sessionid: "as252id6hasdsg-186725hf0s-38723",
		messages: [
			{
				message_type: "text",
				text: "Bom dia"
			},
		]
	}
```

**Send Message**

Tipo: POST
URL: localhost:3000/chatbot/{sessionid}/

HTTP: 200

**Caso nao tenha mapa**
```
Request
	Body:
		{
			message: "bom dia"
		}
	
```
```
Response:
	{
		messages: [
			{
				message_type: "text",
				text: "Bom dia"
			},
		]
	}
```

**Caso retorna mapa**

```
Request
	Body:
		{
			message: "qual a upa mais proxima do endereco rua luiza miranda coelho, 400"
		}
	
```
```
Response:
	{
		messages: [
			{
				message_type: "text",
				text: "Rua A, 222"
			},
			{
				message_type: "location",
				location: [123, 456]
			}
		]
	}
```

**Caso a Session nao exista**

HTTP: 404

Response:
```
"Session not found"
```

**Mensagem vazia**

HTTP: 400

Response:
```
"Message empty"
```

