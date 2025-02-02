import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatStepper } from '@angular/material/stepper';
import { MatTableDataSource } from '@angular/material/table';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { QuotationInterface, ProductInterface, DocumentInterface } from 'src/app/models/interface.index';
import { AnswerSendService, ContactsService, DocumentsService, ProductsService, QuotationService, SurveyService } from 'src/app/services/service.index';
import { ProductComponent } from '../../dialogs/product/product.component';
import { OnExit } from '../../../guards/exit-quotation.guard';
import { NgxSpinnerService } from "ngx-spinner";
import { AnswerService } from 'src/app/services/others/answer.service';
//import swal from 'sweetalert';
declare var swal:any

@Component({
  selector: 'app-quotation',
  templateUrl: './quotation.component.html',
  styleUrls: ['./quotation.component.css']
})
export class QuotationComponent implements OnInit, OnExit {
  isCompleted:boolean = false;
  isCompleted2:boolean = true;
  isCompleted3:boolean = true;

  exit:boolean = false;

  aux:number = 0;

  prueba:any='valor';
  validity:number = 0;
  isLinear = false;
  firstFormGroup!: FormGroup;
  secondFormGroup!: FormGroup;

  idQuot:string='';
  idSupplier:string='';
  idAnswer:any;
  quotation!:QuotationInterface;
  survey:any={
    name:''
  };

  public surveyGral:any = {
    name : ''
  }

  cantAnswers:number = 0

  //surveyGral.name = ''

  querys:object[]=[];
  products:ProductInterface[]=[];
  documents:DocumentInterface[]=[];

  answerSurveyAux:any;

  displayedColumns: string[] = ['name', 'unit', 'amount', 'unitPriceOffer', 'subTotalOffer', 'edit'];
  dataSource:any

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    //private _formBuilder: FormBuilder,
    //private route:ActivatedRoute,
    private router:Router,
    private _quotation:QuotationService,
    private _survey:SurveyService,
    private _product:ProductsService,
    private _document:DocumentsService,
    public _contact:ContactsService,
    public dialog:MatDialog,
    private domSanitizer:DomSanitizer,
    public _answerSend:AnswerSendService,
    private spinner: NgxSpinnerService,
    private _answer:AnswerService
    ) {
      //obtenemos el id de la cotizacion
      this.idQuot = this._quotation.idQuot;

      // this._quotation.getQuotationById(this.idQuot).subscribe((res)=>{
      //   console.log(res);
      // })

      this.idSupplier = this._contact.contact.suppliers.id

      this.getAnswer()
    }

  getAnswer(){
    this._quotation.getAnswerByIdQuotAndIdSupplier(this.idQuot, this.idSupplier)
      .subscribe((res:any)=>
      {
        this.idAnswer=res.id;
        this.validity = res.validity || 0 ; 

        if(res.state == 2 || res.state == 4){
          this._answerSend.openModal();
          //this._answerSend.state = 0;
          this.exit = true;
        }
      }
    )
  }

  // ngAfterViewInit() {
  //   //this.dataSource.paginator = this.paginator;
  // }

  ngOnInit(): void {
    // this.firstFormGroup = this._formBuilder.group({
    //   firstCtrl: ['', Validators.required],
    // });
    // this.secondFormGroup = this._formBuilder.group({
    //   secondCtrl: ['', Validators.required],
    // });

    this.getSurveyGral(this.idQuot);

    //this.getDocuments();
    this.loadDocuments();

    this.loadProducts();

    this._product.notificacion.subscribe(res=>this.loadProducts())
  }

  onExit(){
    if(this.exit){
      return true;
    }
    else{
      // const msg = confirm ('¿Esta seguro de abandonar la página? No se guardaran sus respuestas');
      // return msg;
      let a = swal({
        title: "HANSA Business",
        text:"¿Esta seguro de abandonar la página?",
        icon: "info",
        buttons: ['NO', 'SI'],
        dangerMode: true,
      }).then((value:boolean)=>{
        if(value){
          let b = swal({
            title: "HANSA Business",
            text:"¿Desea guardar su información en el estado en el que se encuentra?",
            icon: "info",
            buttons: ['Salir sin guardar', 'Guardar y Salir'],
            dangerMode: true,
          }).then((value:boolean)=>{
            if(value){
              //guardar survey y docs
              this.formResponse();
              this.saveDocsRequired();
            }
            else{
              this.clearQuotation();
            }
            return true;
          })
          return b;
        }
        else{
          return false;
        }
        //console.log(valor)
      });
      return a;
    }
  }

  //devuelve el formulario de preguntas completo
  getSurveyGral(idQuot:any){
    this._quotation.getQuotationById(idQuot).subscribe(res=>{
      this.quotation=res;

      this._survey.getSurveyAndSectionByIdSurvey(this.quotation.idSurvey).pipe(map(
        (res:any)=>res=res[0]
      )).subscribe((res:any)=>{
        this.surveyGral=res;
        let section:any = res.sections;
        for (let i=0;i<section.length;i++){
          let querys:any[]=[];
          this._survey.getQueriesByIdSection(section[i].id)
          .subscribe((res:any)=>{
            for(let j = 0; j < res.length ; j++){
              this._survey.getQueriesAndOptionsByIdQuery(res[j].id)
              .subscribe((resp:any)=>{
              
              //TODO: agregar su respuesta si existe
              this._survey.countAnswerSurveyByIdAnswerAndIdQuery(this.idAnswer, resp.id)
              .subscribe((res:any)=>
                  {
                    if(res.count > 0){
                      if(resp.type != 5){
                        this._survey.getAnswerSurveyByIdAnswerAndIdQueryFindOne(this.idAnswer, resp.id)
                        .subscribe((res:any)=>{
                            resp.answer = res.answer1
                            resp.idAnswerSurvey = res.id
                        })
                      }
                      else{
                        //es de tipo 5 cargar campo check a los options
                        //devolver el listado de answer survey dado idquery e idanswer
                        this._survey.getAnswerSurveyByIdAnswerAndIdQuery(this.idAnswer, resp.id)
                        .subscribe((res:any)=>{
                            resp.answer = res.answer1
                            resp.idAnswerSurvey = res.id
                            for (let option of resp.options){
                                for(let answerSurvey of res){
                                  if(option.name === answerSurvey.answer1){ //solo esta comparando con el primer valor
                                    option.check = true
                                    option.idAnswerSurvey = answerSurvey.id
                                  }
                                  // else{
                                  //   option.check = false
                                  // }
                                }
                            }
                        })

                        //obtenemos el registro de idAnswerSurveyAux si existe
                        this._survey.getAnswerSurveyAux(this.idAnswer, resp.id).subscribe((res:any)=>{
                          //console.log(res);
                          if(res.length > 0){
                            this.aux = 1;
                            // console.log('existe');
                            // console.log('valor');
                            this.answerSurveyAux = res[0];
                            //console.log('valor');
                           // console.log(this.answerSurveyAux);
                            //console.log('No existe el registro');
                          }
                        })
                      }
                    }
                    else{
                      resp.answer = '';
                    }
                  }
                )

              querys.push(resp);
              //console.log('LISTA DE PREGUNTAS')
              //console.log(resp)
              this._survey.countAnswerSurveyByIdAnswer(this.idAnswer)
              .subscribe((res:any)=>this.cantAnswers=res.count)

              if(j+1 == res.length){
                //querys.sort((a, b) => a.orderQuery - b.orderQuery);
                  this.surveyGral.sections[i].querys =  querys.sort((a, b) => a.orderQuery - b.orderQuery);
              }
            })

            }
          })

          //TODO: asignar las respuestas de options
        }
        console.log('***FORMULARIO DE PREGUNTAS***');
        console.log(this.surveyGral);
      })
    })
  }

  

  //carga los productos de las tablas productos y answer products
  loadProducts(){
    this.spinner.show(undefined, {type:'ball-spin-clockwise'});

    this._quotation.getProductsAssocQuotation(this.idQuot)
    .subscribe((res:any)=>{
      this.products=res;

      for(let i=0; i < this.products.length; i++){

        this._product.countAnswerProdServByIdAnswerAndIdProdServ(this.idAnswer, this.products[i].id)
        .subscribe((res:any)=>{
          // console.log('cantidad');
          // console.log(this.idAnswer);
          // console.log(this.products[i].id);

          // console.log(res);
          // debugger;
          //console.log('EXISTE O NO')
          // console.log('verifica existente');
          // console.log(this.products[i]);
          // debugger;
          if(res.count === 0){
            this.products[i].unitPriceOffer = 0;
            this.products[i].subTotalOffer = 0;
            this.products[i].about= '',
            this.products[i].offerName= '',
            this.products[i].link= '',
            this.products[i].timeService= 0,
            this.products[i].advantage= '',
            this.products[i].nameDoc= '',
            this.products[i].doc= '',
            this.products[i].img= ''
          }
          else{
            //TODO: encontrar el registro y asignarlo a esos dos campos
            this._product.getAnswerProdServByIdAnswerAndIdProdServ(this.idAnswer, this.products[i].id)
            .subscribe((res:any)=>{
              this.products[i].idAnswerProd = res.id;
              this.products[i].unitPriceOffer = res.unitPrice;
              this.products[i].subTotalOffer = res.total;
              this.products[i].about= res.about;
              this.products[i].offerName = res.offerName,
              this.products[i].link = res.link,
              this.products[i].timeService = res.timeService,
              this.products[i].advantage = res.advantage,
              this.products[i].nameDoc = res.nameDoc,
              this.products[i].doc = res.doc,
              this.products[i].img = res.img
            })
          }
        })
      }

      this.dataSource = new MatTableDataSource(this.products);
      this.dataSource.paginator = this.paginator;

      this.spinner.hide();
    })
  }

  //carga los documentos de la tabla documentos y answerdocuments
  loadDocuments(){
    this._document.getDocumentsAssocQuotation(this.idQuot).subscribe((documents:any)=>{
      this.documents=documents;
    
      for(let i=0;i<this.documents.length;i++){
        let idDoc = this.documents[i].id
        this._document.countAnswerDocsByIdAnswerAndIdDoc(this.idAnswer, idDoc)
        .subscribe((res:any)=>{

          if(res.count === 0){
            this.documents[i].idAnswer = this.idAnswer
            this.documents[i].nameDoc = ''
            this.documents[i].document = ''
            if(this.documents[i].template){
              this.documents[i].templateSanitized = this.domSanitizer.bypassSecurityTrustUrl(this.documents[i].template!)
            }
          }
          else{
            this._document.getAnswerDocumentByIdAnswerAndIdDocument(this.idAnswer, this.documents[i].id)
            .subscribe((resp:any)=>{
              this.documents[i].idAnswer = resp.idAnswer
              this.documents[i].nameDoc = resp.nameDoc
              this.documents[i].document = resp.document
              this.documents[i].idAnswerDoc = resp.id
              if(this.documents[i].template){
                this.documents[i].templateSanitized = this.domSanitizer.bypassSecurityTrustUrl(this.documents[i].template!)
              }
            })
          }
        })
      }
      //console.log(this.documents)
    })
  }

  //muestra el dialog para responder a los productos de la cotizacion
  responseProduct(value:any){
    //console.log()
    value.idAnswer = this.idAnswer;
    if(value.unitPriceOffer > 0){
      this.dialog.open(ProductComponent, {
        width:'60%',
        data: value,
        disableClose:true
      });
    }
    else{
      swal("HANSA Business", "El precio del producto debe ser mayor a 0", "error");
    }
    // return;
    
  }

  //calcula el subtotal de la tabla de productos
  // calculate(item:any, myPrice:any){
  //   let price:number =+ myPrice
  //   item.unitPriceOffer = price

  //   item.subTotalOffer = item.amount * item.unitPriceOffer
  //   //console.log(item)
  //   if(item.idAnswerProd){
  //     let answerProd = {
  //       unitPrice : item.unitPriceOffer,
  //       total : item.subTotalOffer
  //     }
  //     //actualizar
  //     this._product.updateAnswerProds(item.idAnswerProd, answerProd)
  //     .subscribe(res=>this.loadProducts())
  //   }
  //   else{
  //     let answerProd = {
  //       idAnswer : this.idAnswer,
  //       idProdServ : item.id,
  //       unitPrice : item.unitPriceOffer,
  //       total : item.subTotalOffer
  //     }
  //     this._product.createAnswerProd(answerProd)
  //     .subscribe(res=>{
  //       console.log('registro creado');
  //       this.loadProducts();
  //     })
  //     //crear nuevo
  //   }
  //   //console.log(item)
  // }

  onDocChange(event:any, document:any)
  {

    let file = event.target.files[0]
    //console.log(file)
    if(!event){
      file = null
      return ;
    }

    if(file.name.split('.')[1] === 'xlsx' || file.name.split('.')[1] === 'docx' || file.name.split('.')[1] === 'pdf' || file.name.split('.')[1] === 'csv' || file.name.split('.')[1] === 'txt' || file.name.split('.')[1] === 'ppt' || file.name.split('.')[1] === 'JPG' || file.name.split('.')[1] === 'jpg' || file.name.split('.')[1] === 'png' || file.name.split('.')[1] === 'PNG' || file.name.split('.')[1] === 'txt'){
      //this.documentLoad=file
      //this.nameDocument=file.name

      let reader = new FileReader()
      let urlImagenTemp = reader.readAsDataURL(file)
      reader.onloadend = ()=>{
        document.nameDoc = file.name
        document.document = reader.result
      }
    }
    else{
      swal("HANSA Business", "Tipo de archivo no permitido", "error")
      file=null
      return ;
    }
  }

  //metodo para enviar las respuestas de la cotizacion al solicitante
  sendAnswer(){

    if(this.validDocuments() > 0){
      swal("HANSA Business", "Existen documentos obligatorios sin cargar", "error")
      return;
    }

    this.saveDocsRequired()
    swal({
      title:'Enviar respuesta a comprador',
      text:'Ingrese su comentario',
      content:'input',
      icon:'info',
      buttons:['Cancelar', 'Enviar'],
      dangerMode:true
    }).then((valor:string)=>{
      if(!valor || valor.length === 0){
        //console.log('cancelado')
        return ;
      }

      let answer = {
        id:this.idAnswer,
        state:2,
        commentSupplier:valor,
        validity:this.validity
      }
      
      this.updateAnswer(answer)
    })

  }

  validDocuments(){
    let cont:number=0;
    // console.log(this.documents);
    // return;
    for(let document of this.documents){
      if(document.required == true && (document.document == '' || document.document == null)){
        cont += 1;
      }
    }
    return cont
  }

  //metodo para guardar los documentos requeridos en la cotizacion
  saveDocsRequired(){
    for(let doc of this.documents){
      if(doc.idAnswerDoc){
        let newDoc:any = {
          nameDoc:doc.nameDoc,
          document:doc.document
        }
        //actualizar
        this._document.updateAnswerDocument(doc.idAnswerDoc, newDoc)
        .subscribe(()=>console.log('Se actualizó con exito'))
      }
      else{
        let newDoc:any = {
          idAnswer:doc.idAnswer,
          idDoc:doc.id,
          nameDoc:doc.nameDoc,
          document:doc.document
        }
        //crear nuevo
        this._document.saveAnswerDocument(newDoc).subscribe(()=>console.log('Se creó el registro de manera exitosa'))
      }
    }
  }

  //mo
  updateAnswer(answer:any){
    this.formResponse();
    //console.log(answerDocs)
    //return;
    this._quotation.updateAnswer(answer)
    .subscribe(()=>
    swal("HANSA Business", "Se registró su respuesta de manera exitosa, gracias por participar en nuestras cotizaciones", "success")
    .then(()=>{
      this.exit = true;
      this._answerSend.openModal();
      //this.router.navigate(['/cot-principal']);
    }))
  }

  //metodo que guarda las respuestas a preguntas por parte del proveedor
  formResponse(){
    for(let section of this.surveyGral.sections){
      for(let query of section.querys){
        if(query.type != 5){
          if(query.idAnswerSurvey){
            //actualizar
            //console.log('actualizar')
            let answerSurvey = {
              id : query.idAnswerSurvey,
              answer1 : query.answer
            }
            //console.log(answerSurvey)
            this._survey.updateAnswerSurvey(answerSurvey).subscribe(()=>{
              //swal("HANSA Business", "Se actualizaron sus respuestas", "success")
              console.log('Formulario de preguntas guardado con exito')
            })
          }
          else{
            //crear
            //console.log('crear')
            let answerSurvey = {
              idAnswer : this.idAnswer,
              idQuery : query.id,
              answer1 : query.answer
            }
            //console.log(answerSurvey)
            this._survey.createAnswerSurvey(answerSurvey).subscribe(()=>{
              //swal("HANSA Business", "Se registró sus respuestas", "success")
              console.log('Se registró sus respuestas');
            })
          }
        }
        else{
          let respOptions:string = '';
          for(let option of query.options){
            if(option.check == true){
              respOptions += `${option.name}, `;
            }
          }

          // creamos registro de respuestas de tipo opcional en answerSurveyAux
          if(this.aux == 1){
                //dado el idAnswer e idQuery devolver el idAnswerSurveyAux
                //dado ese id eliminar el registro
            // this._survey.deleteAnswerSurveyAux(this.answerSurveyAux.id).subscribe(()=>{
            //   console.log('Se eliminó la respuesta');
            // });
            //modificar
            let optionUpdate = {
              id:this.answerSurveyAux.id,
              answer:respOptions
            }
            this._survey.updateAnswerSurveyAux(optionUpdate).subscribe();
          }
          else{
            let newOption = {
              idAnswer : this.idAnswer,
              answer : respOptions,
              idQuery : query.options[0].idQuery
            }
            this._survey.createAnswerSurveyAux(newOption).subscribe();
          }

          //creamos el registro en la tabla AnswerSurvey
          for(let option of query.options){
            if(option.idAnswerSurvey){
              // this._survey.updateAnswerSurvey()
              if(option.check == false){
                //eliminamos los que han sido desmarcados
                this._survey.deleteAnswerSurvey(option.idAnswerSurvey).subscribe();
              }
              else{
                //actualizar
              let newOption = {
                id : option.idAnswerSurvey,
                answer1 : option.name,
              }
                this._survey.updateAnswerSurvey(newOption).subscribe()
              }
            }
            else{
              let newOption = {
                idAnswer : this.idAnswer,
                answer1 : option.name,
                idQuery : option.idQuery
              }
              //crear
              this._survey.createAnswerSurvey(newOption).subscribe()
            }
          }
          //por cada opcion guardar
        }
      }
    }
  }

  //verifica si los campos requeridos del formulario de preguntas estan llenados o no
  checkRequiredQuerys(stepper:MatStepper, value:number){
    if(!this.surveyGral){
      if(value==0){
        stepper.previous();
      }
      else{
        stepper.next();
      }
    }
    else{
      let c=0;
    //return 2;
    //return ;
    //this.isCompleted = true;
    //console.log('vamos al siguiente')
    //console.log(this.surveyGral.sections);
    for(let section of this.surveyGral.sections){
      for(let query of section.querys){
        if(query.type != 5 ){
          if(query.required == true && (query.answer == '' || query.answer == null)){
            c += 1;
          }
        }
        else{
          //console.log(query)
          let c2 = 0
          if(query.required == true){
            for(let option of query.options){
              if(option.check == false || !option.check){
                c2 += 1;
              }
            }
            if(query.options.length == c2){
              c += 1;
            }
          }
        }
      }
    }
    if(c > 0){
      swal("HANSA Business", "Llene los campos requeridos", "error")
    }
    else{
      if(value==0){
        stepper.previous();
      }
      else{
        stepper.next();
      }
    }
    }
  }

  // changeCheck(option:any, value:any){
  //   console.log(option)
  //   // if(value == 'on'){
  //   //   option.check=true
  //   // }
  //   // else{
  //   //   option.check=false
  //   // }
  //   // console.log(this.surveyGral)
  // }

  //verifica que se haya dado respuesta a al menos un producto
  checkProducts(stepper:MatStepper){

    if(this.products.length == 0){
      stepper.next();
    }
    else{
      //if()
      let count:number = 0;
      let count2:number = 0;
      for(let product of this.products){
        if(product.unitPriceOffer !<= 0 || product.unitPriceOffer == null){
          count++; // no llenados
        }
        else{
          count2++; //llenados
        }
      }
      if(this.quotation.adjudicationType === 'Total' && count2 != this.products.length){
        swal("Cotización Total", "Debe responder a todos los productos para poder participar", "error");
      }
      else if(this.quotation.adjudicationType === 'Parcial' && count == this.products.length){
        swal("Cotización Parcial", "Debe responder al menos a un producto de la cotización", "error");
      }
      else{

        //controla la validez
        // if(this.validity < 1){
        //   swal("HANSA Business", "Valor no permitido en vigencia", "error");
        //   return;
        // }

        stepper.next()
      }

    }
  }

  clearQuotation(){

    //quitamos validez
    let answer = {
      id:this.idAnswer,
      validity : 0
    };
    this._quotation.updateAnswer(answer)
    .subscribe(()=>{
      console.log('Se quitó la validez');
    })

    //eliminamos respuesta a productos
    this._answer.deleteAnswerProdsByIdAnswer(this.idAnswer)
    .subscribe(()=>{
      console.log('Se ellminaron las respuestas a productos');
    })

    //eliminamos resp a form
    this._answer.deleteAnswerSurveyByIdAnswer(this.idAnswer)
    .subscribe(()=>{
      console.log('Se ellminaron las respuestas al formulario');
    })

    //eliminamos resp a docs sol
    this._answer.deleteAnswerDocsByIdAnswer(this.idAnswer)
    .subscribe(()=>{
      console.log('Se ellminaron las respuestas a documentos');
    })
  }
}
