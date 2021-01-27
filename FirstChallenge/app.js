// Dependencias 
const express = require ('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken")
const dotenv = require('dotenv');
const adminAuth = require('./middleware/middleware')
dotenv.config();

// configurando CORS    
app.use(cors());

// Models
const GameModel  = require('./models/Game')
const UserModel = require('./models/User')

// Database
const database = require('./database/database')


// Estabelecendo uma conexão
database
    .authenticate()
    .then(()=>{
        console.log('Conexão feita com sucesso');
    }).catch((error)=>{
        console.log('Erro: '+error);
    });

// Configuração de dependencias
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.post("/user", adminAuth, (req, res) =>{

    let {email, password} = req.body
    
    let salt = bcrypt.genSaltSync(10)
    let encrypted = bcrypt.hashSync(password, salt)

    UserModel.create({        
        email,
        password: encrypted,
        password: encrypted
    }).then(response =>{
        
        res.statusCode = 201
        res.json({success: true, message:"Usuario criado com sucesso"})
    
    }).catch(error =>{
        console.log(error)
    })
})

app.post("/auth", (req,res) =>{
    let {email, password} = req.body
   
    UserModel.findOne({email}).then(user =>{
        if(user != undefined || user != null || user != ""){

            let correct = bcrypt.compareSync(password, user.password)
            if(correct){

                jwt.sign({id:user.id, email:user.email}, process.env.JWT_SECRET, {expiresIn:"24h"}, (error, token) =>{
                    if(error){
                        res.statusCode = 400;
                        res.json({success:false, error:"Falha interna"})
                    }else{           
                        res.statusCode = 200
                        res.json({success: true, token:token})
                    }
                })
            }else{

                res.statusCode = 400
                res.json({success: false, message:"Credenciais invalidas"})
            
            }
        }else{

            res.statusCode = 401
            res.json({success: false, message:"Email invalido"})
        
        }
    })
})

// Listar Game
app.get('/games', adminAuth, ( req,res ) => {

    GameModel.findAll({raw:true}).then(game=>{
        
        let user = req.loggedUser.id
        
        // HATEOAS
        let heteoas =[
            {
                href:`http://localhost:3000/games/${user}`,
                method:"DELETE",
                rel:"Deletar um game "
            },
            {
                href:`http://localhost:3000/games`,
                method:"POST",
                rel:"Criar um game"
            },
            {
                href:`http://localhost:3000/game/${user}`,
                method:"GET",
                rel:"Pegar informações a respeito de um game especifico"
            },
            
        ]

        res.statusCode = 200
        res.json({data:game, success: true, _links: heteoas})

    })
})

app.get("/games/:id", (req,res) =>{

    let id = req.params.id

    GameModel.findOne({whre:id}).then((game)=>{
        if(game){
            res.statusCode = 200;
            res.json({data:game, success:true})
        }else{
            res.statusCode = 200;
            res.json({success:false, message:"Game não existente"})
        }
    })
})

// Criar Game
app.post('/games', ( req,res ) =>{

    const {title, year, price} = req.body


    if(title == undefined || year == undefined || price ==undefined){
    
        res.statusCode = 400
        res.send('Preencha todos os campos')
    
    }else if(isNaN(year) || isNaN(price)){
        res.sendStatus(400)
        res.json({success:false, message:"erro interno"})
            
    }else{    
        GameModel.create({

            title,
            year,
            price

        }).then(()=>{
            
            res.statusCode = 201
            res.json({message:"Criado com sucesso", success:true})

        })
    }
})

// Deletar um game
app.delete('/games/:id', adminAuth, ( req,res ) =>{

    let id = req.params.id;

    GameModel.findOne({
        where:{
            id
        }
    
    }).then((verification)=>{
       
        if(verification == null){
            res.sendStatus(400)
            res.json({success:false, message:"Jogo não existe"})
        }else{
            GameModel.destroy({
                where:{
                    id
                }
            }).then(()=>{  

                res.sendStatus(201)
                res.json({success: true, message:"Destruido com sucesso"})
            })
        }
        
    }).catch(error=>{
        res.sendStatus(400)
        console.log(error)
    })    
})

// Atualizar um game
app.put('/games/:id', adminAuth, ( req, res )=> {
    let id = req.params.id
    let { title, price, year} = req.body

    GameModel.findOne({
        where:{
            id
        }
    }).then((verification)=>{
        
        if(verification == null){
            res.sendStatus(400)
        }else{
               
            GameModel.update({title, price, year}, {
                where:{
                    id
                }
            }).then(()=>{
                res.sendStatus(200)
            })
        }
        
    }).catch(error=>{
        res.sendStatus(400)
        console.log(error)
    })
    
})

const port = 3000
app.listen( port, ()=>{
    console.log(`Aplicação rodando na porta ${port}`)
})
