import requests
from lxml import html

pagina = requests.get('http://meucongressonacional.com/lavajato/empresas')
q = html.fromstring(pagina.content)
lista_tr = q.xpath('//*[@id="empresas_table"]//tbody//tr')
empresas = []

for tr in lista_tr:
	cnpj = int(tr[0][0].text)
	nome = tr[1][0].text.strip("',/\n,/\t")
	empresas.append((cnpj,nome))
# for i in empresas: print i

for empresa in empresas:
	print empresa[1]
	pagina_da_empresa = requests.get('http://meucongressonacional.com/eleicoes2014/empresa/'+str(empresa[0]))
	root = html.fromstring(pagina_da_empresa.content)
	lista_tr = root.xpath('//*[@id="partido_table"]/tbody//tr')
	doacoes = []
	for tr in lista_tr:
		doacoes.append((tr[0].text, tr[1].text))
	for i in doacoes: print i