# coding: utf-8
import csv
import copy
arq = open('lavajato.csv','r')
output = open('mycsv.csv','w')
csvreader = csv.DictReader(arq)
fnames = copy.deepcopy(csvreader.fieldnames)
fnames.remove('Partido/Empresa')
fnames.append('Partido')
fnames.append('Empresa')
fnames.append('Estado')
outcsv = csv.DictWriter(output,fieldnames = fnames)
outcsv.writeheader()
#['Nome', 'Cargo', 'Partido/Empresa', 'Envolvimento', 'Resultado']
for line in csvreader:
	if line['Nome'] != '':

		pe = line['Partido/Empresa']
		partido = ''
		estado = ''
		empresa = ''
		if  '-' in pe and 'Ex-' not in pe and 'Banval' not in pe:
			partido,estado = pe.split('-')
		else:
			if empresa == '-':
				print line['Nome']
			empresa = pe
		outcsv.writerow({
				'Nome' : line['Nome'],
				'Partido' : partido,
				'Empresa' : empresa,
				'Estado' : estado,
				'Envolvimento' : line['Envolvimento'],
				'Resultado' : line['Resultado'],
			})
arq.close()
output.close()
import pandas
data = pandas.read_csv('mycsv.csv')
bothnull = data.loc[(data['Partido'].isnull()) & (data['Empresa'].isnull())]
# print bothnull['Nome']
bothnull = bothnull['Nome']

# print bothnull,partidos,empresas
arq = open('data.csv','w')
arqcsv = csv.DictWriter(arq,fieldnames=['name','y','drilldown'])
arqcsv.writeheader()
d = {
	'Empresas' : data['Empresa'].count(),
	'Partidos' : data['Partido'].count(),
	'Outros' : bothnull.count(),
}
for key in d:
	arqcsv.writerow({
		'name':key,
		'y':d[key],
		'drilldown':key,
		})

arq.close()	


for key in d:
	if key != 'Outros':
		arq = open(key+'.csv','w')
		fieldname = key[:len(key)-1]
		arqcsv = csv.DictWriter(arq,fieldnames=[fieldname,'Envolvidos',])
		nomes = dict(data[fieldname].value_counts())
		arqcsv.writeheader()
		for k in nomes:
			arqcsv.writerow({
				fieldname:k,
				'Envolvidos':nomes[k],
				})
		arq.close()

fnames = ['Partido','Estado']
outcsv = csv.DictWriter(open('titanic.csv','w'),fnames)
l = data.loc[!data['Partido'].isnull()]
outcsv.writeheader()
for p in l:
	if 'Condenado' in p['Estado']:
		estado = 'Condenado'
		nome = p['Nome']
		outcsv.writerow({
			'estado' : estado,
			'nome' : nome
			})

