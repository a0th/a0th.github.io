import requests
from lxml import html

pagina = requests.get('http://meucongressonacional.com/lavajato/empresas')
q = html.fromstring(pagina.content)
lista_tr = q.xpath('//*[@id="empresas_table"]//tbody//tr')
empresas = []
chaves_de_empresa = [
	'ODEBRECHT',
	'OAS',
	'ANDRADE GUTIERREZ',
	'GALVAO',
	'CAMARGO CORREA',
	'TOYO SETAL',
	'ENGEVIX',
	]

for tr in lista_tr:
	cnpj = tr[0][0].text.strip("',/\n,/\t")
	nome = tr[1][0].text.strip("',/\n,/\t")
	for chave in chaves_de_empresa:
		if chave in nome:
			nome = chave

	empresas.append((cnpj,nome))
# for i in empresas: print i

import csv

arq = open('doacoes2.csv','w')
header  = ['Partido','Empresa','Valor']
arq = csv.DictWriter(arq,header)
arq.writeheader()

for empresa in empresas:
	pagina_da_empresa = requests.get('http://meucongressonacional.com/eleicoes2014/empresa/'+str(empresa[0]))
	root = html.fromstring(pagina_da_empresa.content)
	lista_tr = root.xpath('//*[@id="partido_table"]/tbody//tr')
	# doacoes = []
	if len(lista_tr) > 0:
		for tr in lista_tr:
			p = tr[0].text
			valor = filter(lambda x: x != ',', tr[1].text[:-3])
			arq.writerow({
				'Partido' : p,
				'Valor' : int(valor)/1000000.0,
				'Empresa' : empresa[1]
				})
			# doacoes.append((tr[0].text, tr[1].text))
	
	# print empresa
	# for i in doacoes: print i